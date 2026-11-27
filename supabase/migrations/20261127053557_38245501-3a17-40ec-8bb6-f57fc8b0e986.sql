DO $$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.submit_reservation_request(jsonb)'::regprocedure) INTO definition;
 IF position('ELSIF s.deposit_type=''fixed'' THEN deposit:=least(round(s.deposit_value,2),total);' IN definition)=0 THEN RAISE EXCEPTION 'Unexpected reservation implementation'; END IF;
 definition:=replace(definition,'ELSIF s.deposit_type=''fixed'' THEN deposit:=least(round(s.deposit_value,2),total);','ELSIF s.deposit_type=''fixed'' AND total IS NOT NULL AND s.deposit_value IS NOT NULL THEN deposit:=least(round(s.deposit_value,2),total);');
 EXECUTE definition;
END $$;
DROP POLICY IF EXISTS "Administrators manage blocks" ON public.vehicle_blocks;
CREATE POLICY "Administrators read blocks" ON public.vehicle_blocks FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE POLICY "Administrators create blocks" ON public.vehicle_blocks FOR INSERT TO authenticated WITH CHECK(public.has_role(auth.uid(),'admin') AND created_by=auth.uid());
CREATE POLICY "Administrators edit blocks" ON public.vehicle_blocks FOR UPDATE TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE POLICY "Administrators delete blocks" ON public.vehicle_blocks FOR DELETE TO authenticated USING(public.has_role(auth.uid(),'admin'));