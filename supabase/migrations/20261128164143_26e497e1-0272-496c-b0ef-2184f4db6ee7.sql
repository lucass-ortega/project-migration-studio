ALTER TABLE public.vehicles ADD COLUMN guarantee_amount numeric DEFAULT 600000;
GRANT SELECT(guarantee_amount) ON public.vehicles TO anon, authenticated;
GRANT UPDATE(guarantee_amount) ON public.vehicles TO authenticated;