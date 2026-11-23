-- Runs isolated checks in a subtransaction; all test blocks are rolled back.
DO $$
DECLARE vehicle uuid; block_one uuid; block_two uuid; conflict_rejected boolean; denied boolean;
BEGIN
 IF has_table_privilege('authenticated','public.user_roles','INSERT') THEN RAISE EXCEPTION 'Role escalation is possible'; END IF;
 IF has_function_privilege('anon','public.public_occupied_periods(timestamptz,timestamptz)','EXECUTE') THEN RAISE EXCEPTION 'Privileged RPC is exposed'; END IF;
 SELECT id INTO vehicle FROM public.vehicles ORDER BY sort_order LIMIT 1;
 IF vehicle IS NULL THEN RAISE EXCEPTION 'No vehicle for transactional checks'; END IF;
 BEGIN
  PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
  INSERT INTO public.vehicle_blocks(vehicle_id,start_at,end_at,reason,created_by) VALUES(vehicle,'2099-01-01 10:00+00','2099-01-03 10:00+00','Transactional availability test',gen_random_uuid()) RETURNING id INTO block_one;
  conflict_rejected:=false;
  BEGIN
   INSERT INTO public.vehicle_blocks(vehicle_id,start_at,end_at,reason,created_by) VALUES(vehicle,'2099-01-02 10:00+00','2099-01-04 10:00+00','Overlap test',gen_random_uuid());
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
   IF SQLERRM LIKE 'Conflicto con bloqueo%' THEN conflict_rejected:=true; ELSE RAISE; END IF;
  END;
  IF NOT conflict_rejected THEN RAISE EXCEPTION 'Overlapping blocks were accepted'; END IF;
  INSERT INTO public.vehicle_blocks(vehicle_id,start_at,end_at,reason,created_by) VALUES(vehicle,'2099-01-03 10:00+00','2099-01-04 10:00+00','Adjacent boundary test',gen_random_uuid()) RETURNING id INTO block_two;
  conflict_rejected:=false;
  BEGIN
   UPDATE public.vehicle_blocks SET start_at='2099-01-03 09:59+00' WHERE id=block_two;
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
   IF SQLERRM LIKE 'Conflicto con bloqueo%' THEN conflict_rejected:=true; ELSE RAISE; END IF;
  END;
  IF NOT conflict_rejected THEN RAISE EXCEPTION 'Overlapping block edit was accepted'; END IF;
  DELETE FROM public.vehicle_blocks WHERE id=block_one;
  UPDATE public.vehicle_blocks SET start_at='2099-01-02 10:00+00' WHERE id=block_two;
  PERFORM set_config('request.jwt.claims','{"role":"anon"}',true);
  denied:=false;
  BEGIN
   INSERT INTO public.vehicle_blocks(vehicle_id,start_at,end_at,reason,created_by) VALUES(vehicle,'2099-02-01 10:00+00','2099-02-03 10:00+00','Unauthorized test',gen_random_uuid());
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
   IF SQLERRM='Acceso no autorizado' THEN denied:=true; ELSE RAISE; END IF;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Unauthorized block was accepted'; END IF;
  RAISE EXCEPTION 'Rollback successful isolated tests' USING ERRCODE='ZX001';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN RAISE NOTICE 'Availability tests passed; all test data rolled back';
 END;
END $$;
