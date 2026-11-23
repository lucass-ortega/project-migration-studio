CREATE TYPE public.app_role AS ENUM ('admin');
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,role public.app_role NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,role));
GRANT SELECT ON public.user_roles TO authenticated; GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own authorization" ON public.user_roles FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE TRIGGER user_roles_updated BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE FUNCTION public.has_role(_user_id uuid,_role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role); $$;
REVOKE ALL ON FUNCTION public.has_role(uuid,public.app_role) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role) TO authenticated,service_role;
CREATE TABLE public.vehicle_blocks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,start_at timestamptz NOT NULL,end_at timestamptz NOT NULL,reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 500),created_by uuid NOT NULL DEFAULT auth.uid(),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),CHECK(end_at>start_at));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.vehicle_blocks TO authenticated; GRANT ALL ON public.vehicle_blocks TO service_role;
ALTER TABLE public.vehicle_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Administrators manage blocks" ON public.vehicle_blocks FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE INDEX vehicle_blocks_period ON public.vehicle_blocks(vehicle_id,start_at,end_at);
CREATE TRIGGER vehicle_blocks_updated BEFORE UPDATE ON public.vehicle_blocks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TABLE public.admin_audit_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_id uuid,entity_type text NOT NULL,entity_id uuid,action text NOT NULL,details jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.admin_audit_log TO authenticated; GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Administrators read audit" ON public.admin_audit_log FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE TRIGGER admin_audit_updated BEFORE UPDATE ON public.admin_audit_log FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT ON public.reservations,public.customers TO authenticated;
GRANT UPDATE(status) ON public.reservations TO authenticated;
GRANT UPDATE(brand,model,year,category,transmission,fuel_type,passenger_capacity,luggage_capacity,description,features,images,daily_price,sort_order,is_active) ON public.vehicles TO authenticated;
GRANT UPDATE(whatsapp_number,deposit_type,deposit_value) ON public.business_settings TO authenticated;
CREATE POLICY "Administrators read reservations" ON public.reservations FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE POLICY "Administrators change reservation status" ON public.reservations FOR UPDATE TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE POLICY "Administrators read customers" ON public.customers FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE POLICY "Administrators read all vehicles" ON public.vehicles FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE POLICY "Administrators edit vehicles" ON public.vehicles FOR UPDATE TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE POLICY "Administrators edit settings" ON public.business_settings FOR UPDATE TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.enforce_vehicle_period() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v uuid; starts timestamptz; ends timestamptz; excluded uuid; conflict record;
BEGIN
 IF TG_TABLE_NAME='reservations' THEN
  IF TG_OP='INSERT' AND NEW.status<>'pendiente_confirmacion' AND NOT public.has_role(auth.uid(),'admin') AND coalesce(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'Acceso no autorizado'; END IF;
  IF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
   IF NOT public.has_role(auth.uid(),'admin') AND coalesce(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'Acceso no autorizado'; END IF;
   IF NOT ((OLD.status='pendiente_confirmacion' AND NEW.status IN ('confirmada','rechazada','cancelada')) OR (OLD.status='confirmada' AND NEW.status IN ('cancelada','finalizada'))) THEN RAISE EXCEPTION 'El cambio de estado no está permitido'; END IF;
  END IF;
  v:=NEW.vehicle_id; starts:=NEW.pickup_datetime; ends:=NEW.return_datetime; excluded:=NEW.id;
 ELSE
  IF NOT public.has_role(auth.uid(),'admin') AND coalesce(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'Acceso no autorizado'; END IF;
  IF TG_OP='DELETE' THEN v:=OLD.vehicle_id; ELSE v:=NEW.vehicle_id; starts:=NEW.start_at; ends:=NEW.end_at; excluded:=NEW.id; END IF;
 END IF;
 IF TG_OP='UPDATE' AND NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id THEN
  PERFORM id FROM public.vehicles WHERE id IN (OLD.vehicle_id,NEW.vehicle_id) ORDER BY id FOR UPDATE;
 ELSE PERFORM id FROM public.vehicles WHERE id=v FOR UPDATE; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF TG_TABLE_NAME='reservations' AND NEW.status<>'confirmada' THEN RETURN NEW; END IF;
 SELECT reservation_number AS label,pickup_datetime AS s,return_datetime AS e INTO conflict FROM public.reservations WHERE vehicle_id=v AND status='confirmada' AND (TG_TABLE_NAME<>'reservations' OR id<>excluded) AND pickup_datetime<ends AND return_datetime>starts LIMIT 1;
 IF FOUND THEN RAISE EXCEPTION 'Conflicto con reserva % (% — %)',conflict.label,conflict.s,conflict.e USING ERRCODE='P0001'; END IF;
 SELECT reason AS label,start_at AS s,end_at AS e INTO conflict FROM public.vehicle_blocks WHERE vehicle_id=v AND (TG_TABLE_NAME<>'vehicle_blocks' OR id<>excluded) AND start_at<ends AND end_at>starts LIMIT 1;
 IF FOUND THEN RAISE EXCEPTION 'Conflicto con bloqueo % (% — %)',conflict.label,conflict.s,conflict.e USING ERRCODE='P0001'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.enforce_vehicle_period() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER reservations_period_guard BEFORE INSERT OR UPDATE OF status,vehicle_id,pickup_datetime,return_datetime ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.enforce_vehicle_period();
CREATE TRIGGER blocks_period_guard BEFORE INSERT OR UPDATE OR DELETE ON public.vehicle_blocks FOR EACH ROW EXECUTE FUNCTION public.enforce_vehicle_period();
CREATE FUNCTION public.record_admin_action() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE entity uuid;
BEGIN
 IF TG_TABLE_NAME='reservations' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
 IF TG_OP='DELETE' THEN entity:=OLD.id; ELSE IF TG_TABLE_NAME='business_settings' THEN entity:=NULL; ELSE entity:=NEW.id; END IF; END IF;
 IF auth.uid() IS NOT NULL THEN
  INSERT INTO public.admin_audit_log(actor_id,entity_type,entity_id,action,details) VALUES(auth.uid(),TG_TABLE_NAME,entity,lower(TG_OP),CASE WHEN TG_TABLE_NAME='reservations' THEN jsonb_build_object('before',OLD.status,'after',NEW.status) ELSE jsonb_build_object('operation',TG_OP) END);
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.record_admin_action() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER reservations_admin_audit AFTER UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.record_admin_action();
CREATE TRIGGER blocks_admin_audit AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_blocks FOR EACH ROW EXECUTE FUNCTION public.record_admin_action();
CREATE TRIGGER vehicles_admin_audit AFTER UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.record_admin_action();
CREATE TRIGGER settings_admin_audit AFTER UPDATE ON public.business_settings FOR EACH ROW EXECUTE FUNCTION public.record_admin_action();
CREATE FUNCTION public.public_occupied_periods(_start timestamptz,_end timestamptz) RETURNS TABLE(vehicle_id uuid,start_at timestamptz,end_at timestamptz) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT r.vehicle_id,r.pickup_datetime,r.return_datetime FROM public.reservations r JOIN public.vehicles v ON v.id=r.vehicle_id AND v.is_active WHERE r.status='confirmada' AND r.pickup_datetime<_end AND r.return_datetime>_start AND _end>_start AND _end-_start<=interval '730 days'
 UNION ALL SELECT b.vehicle_id,b.start_at,b.end_at FROM public.vehicle_blocks b JOIN public.vehicles v ON v.id=b.vehicle_id AND v.is_active WHERE b.start_at<_end AND b.end_at>_start AND _end>_start AND _end-_start<=interval '730 days'; $$;
REVOKE ALL ON FUNCTION public.public_occupied_periods(timestamptz,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_occupied_periods(timestamptz,timestamptz) TO anon,authenticated,service_role;