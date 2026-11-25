REVOKE ALL ON public.public_business_settings FROM anon, authenticated, service_role;
GRANT SELECT ON public.public_business_settings TO anon, authenticated, service_role;