REVOKE ALL ON public.business_settings FROM PUBLIC;
REVOKE ALL ON public.business_settings FROM anon;
REVOKE INSERT, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.business_settings FROM authenticated;
GRANT SELECT, UPDATE ON public.business_settings TO authenticated;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view business settings" ON public.business_settings;
CREATE POLICY "Administrators read settings" ON public.business_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE VIEW public.public_business_settings WITH (security_invoker = false, security_barrier = true) AS
  SELECT whatsapp_number, deposit_type, deposit_value, currency FROM public.business_settings WHERE id = 1;
ALTER VIEW public.public_business_settings OWNER TO postgres;
REVOKE ALL ON public.public_business_settings FROM PUBLIC;
GRANT SELECT ON public.public_business_settings TO anon, authenticated, service_role;