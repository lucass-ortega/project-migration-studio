CREATE OR REPLACE FUNCTION public.enforce_vehicle_period() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v uuid; starts timestamptz; ends timestamptz; excluded uuid; conflict record;
BEGIN
 IF TG_TABLE_NAME='reservations' THEN
  IF TG_OP='INSERT' AND NEW.status<>'pendiente_confirmacion' AND NOT public.has_role(auth.uid(),'admin') AND coalesce(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'Acceso no autorizado'; END IF;
  IF TG_OP='UPDATE' THEN
   IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.has_role(auth.uid(),'admin') AND coalesce(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'Acceso no autorizado'; END IF;
    IF NOT ((OLD.status='pendiente_confirmacion' AND NEW.status IN ('confirmada','rechazada','cancelada')) OR (OLD.status='confirmada' AND NEW.status IN ('cancelada','finalizada'))) THEN RAISE EXCEPTION 'El cambio de estado no está permitido'; END IF;
   END IF;
  END IF;
  v:=NEW.vehicle_id; starts:=NEW.pickup_datetime; ends:=NEW.return_datetime; excluded:=NEW.id;
 ELSE
  IF NOT public.has_role(auth.uid(),'admin') AND coalesce(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'Acceso no autorizado'; END IF;
  IF TG_OP='DELETE' THEN v:=OLD.vehicle_id; ELSE v:=NEW.vehicle_id; starts:=NEW.start_at; ends:=NEW.end_at; excluded:=NEW.id; END IF;
 END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id THEN PERFORM id FROM public.vehicles WHERE id IN (OLD.vehicle_id,NEW.vehicle_id) ORDER BY id FOR UPDATE;
  ELSE PERFORM id FROM public.vehicles WHERE id=v FOR UPDATE; END IF;
 ELSE PERFORM id FROM public.vehicles WHERE id=v FOR UPDATE; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF TG_TABLE_NAME='reservations' THEN IF NEW.status<>'confirmada' THEN RETURN NEW; END IF; END IF;
 SELECT reservation_number AS label,pickup_datetime AS s,return_datetime AS e INTO conflict FROM public.reservations WHERE vehicle_id=v AND status='confirmada' AND (TG_TABLE_NAME<>'reservations' OR id<>excluded) AND pickup_datetime<ends AND return_datetime>starts LIMIT 1;
 IF FOUND THEN RAISE EXCEPTION 'Conflicto con reserva % (% — %)',conflict.label,conflict.s,conflict.e USING ERRCODE='P0001'; END IF;
 SELECT reason AS label,start_at AS s,end_at AS e INTO conflict FROM public.vehicle_blocks WHERE vehicle_id=v AND (TG_TABLE_NAME<>'vehicle_blocks' OR id<>excluded) AND start_at<ends AND end_at>starts LIMIT 1;
 IF FOUND THEN RAISE EXCEPTION 'Conflicto con bloqueo % (% — %)',conflict.label,conflict.s,conflict.e USING ERRCODE='P0001'; END IF;
 RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION public.record_admin_action() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE entity uuid; payload jsonb;
BEGIN
 IF TG_TABLE_NAME='reservations' THEN IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF; payload:=jsonb_build_object('before',OLD.status,'after',NEW.status);
 ELSE payload:=jsonb_build_object('operation',TG_OP); END IF;
 IF TG_OP='DELETE' THEN entity:=OLD.id; ELSE IF TG_TABLE_NAME='business_settings' THEN entity:=NULL; ELSE entity:=NEW.id; END IF; END IF;
 IF auth.uid() IS NOT NULL THEN INSERT INTO public.admin_audit_log(actor_id,entity_type,entity_id,action,details) VALUES(auth.uid(),TG_TABLE_NAME,entity,lower(TG_OP),payload); END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END; $$;