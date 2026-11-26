-- Least privilege, including privileges that RLS does not protect (TRUNCATE).
REVOKE ALL ON public.vehicles,public.reservations,public.customers,public.vehicle_blocks,public.business_settings,public.user_roles,public.admin_audit_log,public.reservation_counters FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.vehicles TO anon,authenticated;
GRANT UPDATE (brand,model,year,category,transmission,fuel_type,passenger_capacity,luggage_capacity,description,features,images,daily_price,sort_order,is_active) ON public.vehicles TO authenticated;
GRANT SELECT ON public.reservations,public.customers,public.business_settings,public.user_roles,public.admin_audit_log TO authenticated;
GRANT UPDATE (status) ON public.reservations TO authenticated;
GRANT UPDATE (whatsapp_number,deposit_type,deposit_value) ON public.business_settings TO authenticated;
GRANT SELECT,DELETE ON public.vehicle_blocks TO authenticated;
GRANT INSERT (vehicle_id,start_at,end_at,reason,created_by),UPDATE (vehicle_id,start_at,end_at,reason) ON public.vehicle_blocks TO authenticated;
GRANT ALL ON public.vehicles,public.reservations,public.customers,public.vehicle_blocks,public.business_settings,public.user_roles,public.admin_audit_log,public.reservation_counters TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_counters ENABLE ROW LEVEL SECURITY;
REVOKE CREATE ON SCHEMA public FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable(),public.set_updated_at(),public.enforce_vehicle_period(),public.record_admin_action() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.next_reservation_number() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.next_reservation_number() TO service_role;
REVOKE ALL ON FUNCTION public.has_role(uuid,public.app_role) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.public_occupied_periods(_start timestamptz,_end timestamptz)
RETURNS TABLE(vehicle_id uuid,start_at timestamptz,end_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog,public AS $$
BEGIN
 IF _start IS NULL OR _end IS NULL OR NOT isfinite(_start) OR NOT isfinite(_end) OR _end<=_start OR _end-_start>interval '730 days' THEN
  RAISE EXCEPTION 'Elegí un período válido de hasta dos años.' USING ERRCODE='22023';
 END IF;
 RETURN QUERY
 SELECT r.vehicle_id,greatest(r.pickup_datetime,_start),least(r.return_datetime,_end)
 FROM public.reservations r JOIN public.vehicles v ON v.id=r.vehicle_id AND v.is_active
 WHERE r.status='confirmada' AND r.pickup_datetime<_end AND r.return_datetime>_start
 UNION ALL
 SELECT b.vehicle_id,greatest(b.start_at,_start),least(b.end_at,_end)
 FROM public.vehicle_blocks b JOIN public.vehicles v ON v.id=b.vehicle_id AND v.is_active
 WHERE b.start_at<_end AND b.end_at>_start;
END $$;
REVOKE ALL ON FUNCTION public.public_occupied_periods(timestamptz,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_occupied_periods(timestamptz,timestamptz) TO anon,authenticated,service_role;

-- lpad with a fixed length truncates counters above 9999; preserve all digits.
CREATE OR REPLACE FUNCTION public.next_reservation_number() RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE y integer:=extract(year FROM (now() AT TIME ZONE 'America/Argentina/Buenos_Aires'))::integer; n integer;
BEGIN
 INSERT INTO public.reservation_counters(year,last_value) VALUES(y,1)
 ON CONFLICT(year) DO UPDATE SET last_value=public.reservation_counters.last_value+1 RETURNING last_value INTO n;
 RETURN 'DVR-'||y||'-'||lpad(n::text,greatest(4,length(n::text)),'0');
END $$;

ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS request_fingerprint text;
CREATE OR REPLACE FUNCTION public.protect_reservation_history() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.status<>'pendiente_confirmacion' THEN RAISE EXCEPTION 'Las solicitudes deben comenzar pendientes de confirmación.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.vehicles WHERE id=NEW.vehicle_id AND is_active) THEN RAISE EXCEPTION 'El vehículo seleccionado no está disponible.'; END IF;
  IF NOT isfinite(NEW.pickup_datetime) OR NOT isfinite(NEW.return_datetime) OR NEW.pickup_datetime<now() OR NEW.return_datetime<=NEW.pickup_datetime OR NEW.return_datetime-NEW.pickup_datetime>interval '730 days' THEN RAISE EXCEPTION 'Las fechas seleccionadas no son válidas.'; END IF;
 ELSE
  IF (to_jsonb(NEW)-'status'-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'status'-'updated_at') THEN
   RAISE EXCEPTION 'Los datos históricos de una solicitud no se pueden modificar.';
  END IF;
  IF NEW.status='confirmada' AND NOT EXISTS(SELECT 1 FROM public.vehicles WHERE id=NEW.vehicle_id AND is_active) THEN RAISE EXCEPTION 'El vehículo seleccionado no está disponible.'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.protect_reservation_history() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER reservations_history_guard BEFORE INSERT OR UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.protect_reservation_history();

CREATE OR REPLACE FUNCTION public.validate_business_settings() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.deposit_type='percent' AND NEW.deposit_value>100 THEN RAISE EXCEPTION 'La seña porcentual debe estar entre 0 y 100.'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_business_settings() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER settings_value_guard BEFORE INSERT OR UPDATE ON public.business_settings FOR EACH ROW EXECUTE FUNCTION public.validate_business_settings();

-- Atomic service-only operation. The public server handler validates and strips input.
CREATE OR REPLACE FUNCTION public.submit_reservation_request(_request jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE k uuid; fingerprint text; r public.reservations%ROWTYPE; v public.vehicles%ROWTYPE; s public.business_settings%ROWTYPE;
 c uuid; p timestamptz; e timestamptz; d integer; total numeric; deposit numeric; ret jsonb;
BEGIN
 IF coalesce(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'Acceso no autorizado'; END IF;
 IF jsonb_typeof(_request)<>'object' OR octet_length(_request::text)>16000 THEN RAISE EXCEPTION 'Solicitud inválida'; END IF;
 k:=(_request->>'idempotencyKey')::uuid;
 IF k IS NULL THEN RAISE EXCEPTION 'Solicitud inválida'; END IF;
 fingerprint:=encode(sha256(convert_to(_request::text,'UTF8')),'hex');
 PERFORM pg_advisory_xact_lock(hashtextextended(k::text,0));
 SELECT * INTO r FROM public.reservations WHERE idempotency_key=k;
 IF FOUND THEN
  IF r.request_fingerprint IS DISTINCT FROM fingerprint THEN RAISE EXCEPTION 'La clave de solicitud ya fue utilizada con otros datos.'; END IF;
 ELSE
  SELECT * INTO v FROM public.vehicles WHERE id=(_request->>'vehicleId')::uuid FOR UPDATE;
  IF NOT FOUND OR NOT v.is_active THEN RAISE EXCEPTION 'El vehículo seleccionado no está disponible.'; END IF;
  p:=((_request->>'pickupDate')||'T'||(_request->>'pickupTime')||':00-03:00')::timestamptz;
  e:=((_request->>'returnDate')||'T'||(_request->>'returnTime')||':00-03:00')::timestamptz;
  IF p IS NULL OR e IS NULL OR NOT isfinite(p) OR NOT isfinite(e) OR p<now() OR e<=p OR e-p>interval '730 days'
   OR to_char(p AT TIME ZONE 'America/Argentina/Buenos_Aires','YYYY-MM-DD')<>_request->>'pickupDate'
   OR to_char(e AT TIME ZONE 'America/Argentina/Buenos_Aires','YYYY-MM-DD')<>_request->>'returnDate' THEN RAISE EXCEPTION 'Las fechas seleccionadas no son válidas.'; END IF;
  IF EXISTS(SELECT 1 FROM public.public_occupied_periods(p,e) o WHERE o.vehicle_id=v.id) THEN RAISE EXCEPTION 'El vehículo está ocupado durante las fechas seleccionadas.'; END IF;
  SELECT * INTO s FROM public.business_settings WHERE id=1;
  IF NOT FOUND THEN RAISE EXCEPTION 'No se pudo cargar la configuración.'; END IF;
  d:=ceil(extract(epoch FROM (e-p))/86400)::integer;
  total:=round(v.daily_price*d,2);
  IF s.deposit_type='percent' THEN deposit:=round(total*s.deposit_value/100,2);
  ELSIF s.deposit_type='fixed' THEN deposit:=least(round(s.deposit_value,2),total); END IF;
  ret:=CASE WHEN (_request->>'sameReturn')::boolean THEN _request->'pickup' ELSE _request->'ret' END;
  -- Each request gets an immutable customer snapshot; never overwrite an earlier customer.
  INSERT INTO public.customers(first_name,last_name,dni,phone,whatsapp,email,country)
  VALUES(_request#>>'{customer,firstName}',_request#>>'{customer,lastName}',_request#>>'{customer,dni}',_request#>>'{customer,phone}',_request#>>'{customer,whatsapp}',_request#>>'{customer,email}',_request#>>'{customer,country}') RETURNING id INTO c;
  INSERT INTO public.reservations(reservation_number,idempotency_key,customer_id,vehicle_id,vehicle_snapshot,pickup_datetime,return_datetime,pickup_location_type,pickup_address,pickup_city,pickup_reference,return_location_type,return_address,return_city,return_reference,same_return_location,duration_days,daily_price_snapshot,total_amount,deposit_amount,remaining_amount,customer_notes,status,request_fingerprint)
  VALUES(public.next_reservation_number(),k,c,v.id,jsonb_build_object('brand',v.brand,'model',v.model,'year',v.year,'category',v.category,'transmission',v.transmission,'fuel_type',v.fuel_type,'images',v.images,'daily_price',v.daily_price),p,e,_request#>>'{pickup,type}',_request#>>'{pickup,address}',_request#>>'{pickup,city}',nullif(_request#>>'{pickup,reference}',''),ret->>'type',ret->>'address',ret->>'city',nullif(ret->>'reference',''),(_request->>'sameReturn')::boolean,d,v.daily_price,total,deposit,total-deposit,nullif(_request->>'notes',''),'pendiente_confirmacion',fingerprint) RETURNING * INTO r;
 END IF;
 RETURN jsonb_build_object('reservationNumber',r.reservation_number,'status',r.status,'vehicle',jsonb_build_object('brand',r.vehicle_snapshot->>'brand','model',r.vehicle_snapshot->>'model','year',(r.vehicle_snapshot->>'year')::integer),'quote',jsonb_build_object('days',r.duration_days,'dailyPrice',r.daily_price_snapshot,'total',r.total_amount,'deposit',r.deposit_amount,'remaining',r.remaining_amount));
END $$;
REVOKE ALL ON FUNCTION public.submit_reservation_request(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_reservation_request(jsonb) TO service_role;

-- Require generated names scoped to an actual vehicle. Bucket already enforces MIME and size.
DROP POLICY IF EXISTS "Administrators upload vehicle photos" ON storage.objects;
CREATE POLICY "Administrators upload vehicle photos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK(bucket_id='vehicle-images' AND public.has_role(auth.uid(),'admin') AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$' AND EXISTS(SELECT 1 FROM public.vehicles v WHERE v.id::text=split_part(name,'/',1)));
-- Intentionally retain public_business_settings unchanged: explicit 4 columns, id=1,
-- security_barrier=true, security_invoker=false, read-only grants and protected base table.
NOTIFY pgrst,'reload schema';