-- Executed through the migration tool. Everything inside the fixture subtransaction
-- is rolled back, including customers, counters, roles, audit entries and settings.
DO $$
DECLARE
 admin_id uuid; vehicle uuid; inactive uuid; first_id uuid; second_id uuid; block_id uuid;
 request jsonb; result jsonb; repeat_result jsonb; denied boolean; n integer; before_customers integer;
 before_logs integer; original_phone text; table_name text; invalid_start timestamptz; invalid_end timestamptz;
BEGIN
 SELECT user_id INTO admin_id FROM public.user_roles WHERE role='admin' ORDER BY created_at LIMIT 1;
 IF admin_id IS NULL THEN RAISE EXCEPTION 'No existing administrator available for role-context tests'; END IF;
 FOREACH table_name IN ARRAY ARRAY['vehicles','reservations','customers','vehicle_blocks','business_settings','user_roles','admin_audit_log','reservation_counters'] LOOP
  IF has_table_privilege('anon','public.'||table_name,'TRUNCATE') OR has_table_privilege('authenticated','public.'||table_name,'TRUNCATE') THEN RAISE EXCEPTION 'Excessive truncate privilege: %',table_name; END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=('public.'||table_name)::regclass) THEN RAISE EXCEPTION 'RLS missing: %',table_name; END IF;
 END LOOP;
 IF has_column_privilege('authenticated','public.reservations','total_amount','UPDATE') THEN RAISE EXCEPTION 'Historical price edit privilege'; END IF;
 IF has_table_privilege('authenticated','public.user_roles','INSERT') THEN RAISE EXCEPTION 'Role escalation privilege'; END IF;
 IF has_function_privilege('anon','public.submit_reservation_request(jsonb)','EXECUTE') OR has_function_privilege('authenticated','public.submit_reservation_request(jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Submission RPC exposed'; END IF;
 IF has_function_privilege('anon','public.public_occupied_periods(timestamptz,timestamptz)','EXECUTE') THEN RAISE EXCEPTION 'Privileged availability RPC exposed'; END IF;
 IF (SELECT array_agg(column_name::text ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema='public' AND table_name='public_business_settings')<>ARRAY['whatsapp_number','deposit_type','deposit_value','currency'] THEN RAISE EXCEPTION 'Public settings fields differ'; END IF;
 BEGIN
  PERFORM set_config('request.jwt.claims',jsonb_build_object('role','service_role','sub',admin_id)::text,true);
  INSERT INTO public.vehicles(brand,model,year,category,transmission,passenger_capacity,daily_price)
  VALUES('Prueba aislada','Seguridad',2026,'Prueba','Manual',5,100) RETURNING id INTO vehicle;
  INSERT INTO public.vehicles(brand,model,year,category,transmission,passenger_capacity,is_active)
  VALUES('Prueba aislada','Inactivo',2026,'Prueba','Manual',5,false) RETURNING id INTO inactive;
  SELECT count(*) INTO before_customers FROM public.customers;
  SELECT count(*) INTO before_logs FROM public.admin_audit_log WHERE actor_id=admin_id;
  request:=jsonb_build_object('idempotencyKey',gen_random_uuid(),'vehicleId',vehicle,'pickupDate','2099-01-01','pickupTime','10:00','returnDate','2099-01-05','returnTime','10:00','sameReturn',true,
   'pickup',jsonb_build_object('type','hotel','address','Prueba 1','city','General Roca','reference',null),
   'ret',jsonb_build_object('type','hotel','address','Prueba 1','city','General Roca','reference',null),
   'customer',jsonb_build_object('firstName','Prueba','lastName','Aislada','dni','PRUEBA123','phone','5492985000000','whatsapp','5492985000000','email','prueba@example.invalid','country','Argentina'),'notes',null);
  result:=public.submit_reservation_request(request);
  SELECT id INTO first_id FROM public.reservations WHERE reservation_number=result->>'reservationNumber';
  IF result->>'status'<>'pendiente_confirmacion' OR (result#>>'{quote,dailyPrice}')::numeric<>100 OR (result#>>'{quote,total}')::numeric<>400 THEN RAISE EXCEPTION 'Initial status or authoritative price incorrect'; END IF;
  IF EXISTS(SELECT 1 FROM public.public_occupied_periods('2099-01-01','2099-01-06') WHERE vehicle_id=vehicle) THEN RAISE EXCEPTION 'Pending reservation blocks availability'; END IF;
  UPDATE public.vehicles SET daily_price=200 WHERE id=vehicle;
  repeat_result:=public.submit_reservation_request(request);
  IF repeat_result<>result OR (SELECT count(*) FROM public.customers)<>before_customers+1 THEN RAISE EXCEPTION 'Idempotent retry changed snapshot or duplicated customer'; END IF;
  denied:=false;
  BEGIN PERFORM public.submit_reservation_request(request||jsonb_build_object('notes','Modified retry')); EXCEPTION WHEN SQLSTATE 'P0001' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Changed idempotency payload accepted'; END IF;
  SELECT phone INTO original_phone FROM public.customers WHERE id=(SELECT customer_id FROM public.reservations WHERE id=first_id);
  request:=jsonb_set(request,'{idempotencyKey}',to_jsonb(gen_random_uuid()));
  request:=jsonb_set(request,'{customer,phone}','"5492985111111"');
  repeat_result:=public.submit_reservation_request(request);
  SELECT id INTO second_id FROM public.reservations WHERE reservation_number=repeat_result->>'reservationNumber';
  IF (SELECT phone FROM public.customers WHERE id=(SELECT customer_id FROM public.reservations WHERE id=first_id))<>original_phone THEN RAISE EXCEPTION 'New request overwrote prior customer'; END IF;
  -- Effective anon privileges, not just policy definitions.
  PERFORM set_config('request.jwt.claims','{"role":"anon"}',true);
  EXECUTE 'SET LOCAL ROLE anon';
  PERFORM 1 FROM public.vehicles WHERE is_active;
  IF EXISTS(SELECT 1 FROM public.vehicles WHERE id=inactive) THEN RAISE EXCEPTION 'Inactive vehicle exposed'; END IF;
  SELECT count(*) INTO n FROM public.public_business_settings;
  IF n<>1 THEN RAISE EXCEPTION 'Public settings row count'; END IF;
  FOREACH table_name IN ARRAY ARRAY['customers','reservations','business_settings','vehicle_blocks','user_roles','admin_audit_log','reservation_counters'] LOOP
   denied:=false;
   BEGIN EXECUTE format('SELECT 1 FROM public.%I LIMIT 1',table_name); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
   IF NOT denied THEN RAISE EXCEPTION 'Anonymous private read accepted: %',table_name; END IF;
  END LOOP;
  denied:=false;
  BEGIN UPDATE public.vehicles SET daily_price=1 WHERE id=vehicle; EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Anonymous vehicle edit accepted'; END IF;
  denied:=false;
  BEGIN INSERT INTO public.vehicle_blocks(vehicle_id,start_at,end_at,reason,created_by) VALUES(vehicle,'2099-02-01','2099-02-02','Unauthorized',admin_id); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Anonymous block creation accepted'; END IF;
  EXECUTE 'RESET ROLE';
  -- Simulate loss of permission for a REAL existing account, only in a rolled-back subtransaction.
  BEGIN
   DELETE FROM public.user_roles WHERE user_id=admin_id;
   PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',admin_id)::text,true);
   EXECUTE 'SET LOCAL ROLE authenticated';
   IF public.has_role(admin_id,'admin') THEN RAISE EXCEPTION 'Revoked role remains authorized'; END IF;
   IF EXISTS(SELECT 1 FROM public.customers) OR EXISTS(SELECT 1 FROM public.reservations) OR EXISTS(SELECT 1 FROM public.business_settings) OR EXISTS(SELECT 1 FROM public.vehicle_blocks) OR EXISTS(SELECT 1 FROM public.admin_audit_log) THEN RAISE EXCEPTION 'Nonadministrator sees private data'; END IF;
   UPDATE public.reservations SET status='confirmada' WHERE id=first_id;
   GET DIAGNOSTICS n=ROW_COUNT;
   IF n<>0 THEN RAISE EXCEPTION 'Nonadministrator changed reservation'; END IF;
   EXECUTE 'RESET ROLE';
   RAISE EXCEPTION 'Restore isolated authorization fixture' USING ERRCODE='ZX002';
  EXCEPTION WHEN SQLSTATE 'ZX002' THEN NULL;
  END;
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',admin_id)::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  IF NOT public.has_role(admin_id,'admin') OR NOT EXISTS(SELECT 1 FROM public.reservations WHERE id=first_id) THEN RAISE EXCEPTION 'Administrator read denied'; END IF;
  UPDATE public.reservations SET status='confirmada' WHERE id=first_id;
  denied:=false;
  BEGIN UPDATE public.reservations SET status='confirmada' WHERE id=second_id; EXCEPTION WHEN SQLSTATE 'P0001' THEN IF SQLERRM LIKE 'Conflicto con reserva%' THEN denied:=true; ELSE RAISE; END IF; END;
  IF NOT denied THEN RAISE EXCEPTION 'Overlapping confirmed reservations accepted'; END IF;
  denied:=false;
  BEGIN INSERT INTO public.vehicle_blocks(vehicle_id,start_at,end_at,reason,created_by) VALUES(vehicle,'2099-01-02','2099-01-03','Conflict',admin_id); EXCEPTION WHEN SQLSTATE 'P0001' THEN IF SQLERRM LIKE 'Conflicto con reserva%' THEN denied:=true; ELSE RAISE; END IF; END;
  IF NOT denied THEN RAISE EXCEPTION 'Block overlaps confirmed reservation'; END IF;
  UPDATE public.reservations SET status='cancelada' WHERE id=first_id;
  EXECUTE 'RESET ROLE';
  IF EXISTS(SELECT 1 FROM public.public_occupied_periods('2099-01-01','2099-01-06') WHERE vehicle_id=vehicle) THEN RAISE EXCEPTION 'Cancellation did not release period'; END IF;
  EXECUTE 'SET LOCAL ROLE authenticated';
  INSERT INTO public.vehicle_blocks(vehicle_id,start_at,end_at,reason,created_by) VALUES(vehicle,'2099-01-02','2099-01-04','Manual test',admin_id) RETURNING id INTO block_id;
  denied:=false;
  BEGIN UPDATE public.reservations SET status='confirmada' WHERE id=second_id; EXCEPTION WHEN SQLSTATE 'P0001' THEN IF SQLERRM LIKE 'Conflicto con bloqueo%' THEN denied:=true; ELSE RAISE; END IF; END;
  IF NOT denied THEN RAISE EXCEPTION 'Confirmation bypassed manual block'; END IF;
  EXECUTE 'RESET ROLE';
  IF EXISTS(SELECT 1 FROM public.public_occupied_periods('2099-01-02 12:00+00','2099-01-03 12:00+00') WHERE vehicle_id=vehicle AND (start_at<'2099-01-02 12:00+00' OR end_at>'2099-01-03 12:00+00')) THEN RAISE EXCEPTION 'Availability escapes requested range'; END IF;
  EXECUTE 'SET LOCAL ROLE authenticated';
  DELETE FROM public.vehicle_blocks WHERE id=block_id;
  UPDATE public.reservations SET status='confirmada' WHERE id=second_id;
  UPDATE public.reservations SET status='finalizada' WHERE id=second_id;
  UPDATE public.vehicles SET description='Isolated update' WHERE id=vehicle;
  UPDATE public.business_settings SET whatsapp_number=whatsapp_number WHERE id=1;
  denied:=false;
  BEGIN UPDATE public.reservations SET total_amount=1 WHERE id=first_id; EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Administrator altered historical price'; END IF;
  EXECUTE 'RESET ROLE';
  IF EXISTS(SELECT 1 FROM public.public_occupied_periods('2099-01-01','2099-01-06') WHERE vehicle_id=vehicle) THEN RAISE EXCEPTION 'Finalized reservation blocks period'; END IF;
  IF (SELECT count(*) FROM public.admin_audit_log WHERE actor_id=admin_id)<before_logs+8 THEN RAISE EXCEPTION 'Administrative actions missing from audit'; END IF;
  denied:=false;
  BEGIN UPDATE public.reservations SET total_amount=1 WHERE id=first_id; EXCEPTION WHEN SQLSTATE 'P0001' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'History trigger failed'; END IF;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('role','service_role','sub',admin_id)::text,true);
  denied:=false;
  BEGIN PERFORM public.submit_reservation_request(jsonb_set(jsonb_set(request,'{idempotencyKey}',to_jsonb(gen_random_uuid())),'{vehicleId}',to_jsonb(inactive))); EXCEPTION WHEN SQLSTATE 'P0001' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Inactive vehicle request accepted'; END IF;
  -- Invalid ranges raise errors, rather than silently pretending availability.
  FOR invalid_start,invalid_end IN SELECT * FROM (VALUES (NULL::timestamptz,'2099-01-01'::timestamptz),('2099-01-01'::timestamptz,'2099-01-01'::timestamptz),('2099-01-02'::timestamptz,'2099-01-01'::timestamptz),('2099-01-01'::timestamptz,'2101-01-02'::timestamptz),('-infinity'::timestamptz,'2099-01-01'::timestamptz)) LOOP
   denied:=false;
   BEGIN PERFORM public.public_occupied_periods(invalid_start,invalid_end); EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
   IF NOT denied THEN RAISE EXCEPTION 'Invalid availability range accepted'; END IF;
  END LOOP;
  PERFORM public.public_occupied_periods('2099-01-01',('2099-01-01'::timestamptz+interval '730 days'));
  -- A nullable price with fixed deposit must keep every amount unquoted.
  UPDATE public.vehicles SET daily_price=NULL WHERE id=vehicle;
  UPDATE public.business_settings SET deposit_type='fixed',deposit_value=50 WHERE id=1;
  result:=public.submit_reservation_request(jsonb_set(request,'{idempotencyKey}',to_jsonb(gen_random_uuid())));
  IF result#>'{quote,total}'<>'null'::jsonb OR result#>'{quote,deposit}'<>'null'::jsonb OR result#>'{quote,remaining}'<>'null'::jsonb THEN RAISE EXCEPTION 'Unquoted price acquired a fixed deposit'; END IF;
  RAISE EXCEPTION 'All isolated security checks passed' USING ERRCODE='ZX001';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN
  RAISE NOTICE 'Security hardening tests passed; fixtures, counters, roles and audit entries rolled back';
 END;
END $$;