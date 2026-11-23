CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid,_role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$ SELECT _user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role=_role); $$;
REVOKE EXECUTE ON FUNCTION public.public_occupied_periods(timestamptz,timestamptz) FROM anon,authenticated;
DROP POLICY "Administrators read all vehicles" ON public.vehicles;
DROP POLICY "Public can view active vehicles" ON public.vehicles;
CREATE POLICY "Visitors read active vehicles" ON public.vehicles FOR SELECT TO anon USING(is_active=true);
CREATE POLICY "Authenticated vehicle access" ON public.vehicles FOR SELECT TO authenticated USING(is_active=true OR public.has_role(auth.uid(),'admin'));
