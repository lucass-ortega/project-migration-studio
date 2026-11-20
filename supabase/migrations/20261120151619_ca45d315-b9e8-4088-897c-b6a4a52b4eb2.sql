CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  category text NOT NULL,
  transmission text NOT NULL,
  fuel_type text,
  passenger_capacity integer NOT NULL,
  luggage_capacity integer,
  description text,
  features text[] NOT NULL DEFAULT '{}',
  images text[] NOT NULL DEFAULT '{}',
  daily_price numeric(12,2) CHECK (daily_price IS NULL OR daily_price > 0),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vehicles TO anon, authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active vehicles" ON public.vehicles FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE TRIGGER vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.business_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  whatsapp_number text,
  deposit_type text CHECK (deposit_type IN ('percent','fixed')),
  deposit_value numeric(12,2) CHECK (deposit_value IS NULL OR deposit_value >= 0),
  currency text NOT NULL DEFAULT 'ARS',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_settings TO anon, authenticated;
GRANT ALL ON public.business_settings TO service_role;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view business settings" ON public.business_settings FOR SELECT TO anon, authenticated USING (true);
CREATE TRIGGER business_settings_updated_at BEFORE UPDATE ON public.business_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.business_settings (id) VALUES (1);

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  dni text NOT NULL,
  phone text NOT NULL,
  whatsapp text NOT NULL,
  email text NOT NULL,
  country text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customers_dni_idx ON public.customers (dni);
CREATE INDEX customers_email_idx ON public.customers (lower(email));
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.reservation_counters (
  year integer PRIMARY KEY,
  last_value integer NOT NULL DEFAULT 0
);
GRANT ALL ON public.reservation_counters TO service_role;
ALTER TABLE public.reservation_counters ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_number text NOT NULL UNIQUE,
  idempotency_key uuid NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  vehicle_snapshot jsonb NOT NULL,
  pickup_datetime timestamptz NOT NULL,
  return_datetime timestamptz NOT NULL,
  pickup_location_type text NOT NULL CHECK (pickup_location_type IN ('hotel','domicilio','aeropuerto','otro')),
  pickup_address text NOT NULL,
  pickup_city text NOT NULL,
  pickup_reference text,
  return_location_type text NOT NULL CHECK (return_location_type IN ('hotel','domicilio','aeropuerto','otro')),
  return_address text NOT NULL,
  return_city text NOT NULL,
  return_reference text,
  same_return_location boolean NOT NULL DEFAULT false,
  duration_days integer NOT NULL CHECK (duration_days > 0),
  daily_price_snapshot numeric(12,2),
  total_amount numeric(12,2),
  deposit_amount numeric(12,2),
  remaining_amount numeric(12,2),
  customer_notes text,
  status text NOT NULL DEFAULT 'pendiente_confirmacion' CHECK (status IN ('pendiente_confirmacion','confirmada','rechazada','cancelada','finalizada')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (return_datetime > pickup_datetime)
);
CREATE INDEX reservations_vehicle_dates_idx ON public.reservations (vehicle_id, pickup_datetime, return_datetime);
CREATE INDEX reservations_customer_idx ON public.reservations (customer_id);
CREATE INDEX reservations_status_idx ON public.reservations (status);
GRANT ALL ON public.reservations TO service_role;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER reservations_updated_at BEFORE UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.next_reservation_number() RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE y integer := extract(year FROM (now() AT TIME ZONE 'America/Argentina/Buenos_Aires'))::int; v integer;
BEGIN
  INSERT INTO public.reservation_counters (year, last_value) VALUES (y, 1)
  ON CONFLICT (year) DO UPDATE SET last_value = reservation_counters.last_value + 1
  RETURNING last_value INTO v;
  RETURN 'DVR-' || y || '-' || lpad(v::text, 4, '0');
END; $$;
REVOKE ALL ON FUNCTION public.next_reservation_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_reservation_number() TO service_role;

INSERT INTO public.vehicles (brand, model, year, category, transmission, fuel_type, passenger_capacity, luggage_capacity, description, features, images, sort_order) VALUES
('Renault','Kardian Evolution 1.6 MT',2026,'SUV Compacto','Manual','Nafta',5,2,'SUV · 5 puertas',ARRAY['Aire acondicionado'],ARRAY['/__l5e/assets-v1/e7900237-e733-4971-9a6d-5d7d12c914f0/renault-kardian.webp'],1),
('Renault','Logan Life 1.6',2024,'Sedán','Manual','Nafta',5,3,'Sedán · 4 puertas',ARRAY['Aire acondicionado'],ARRAY['/__l5e/assets-v1/7a2be52a-b8bb-43f6-9fce-ccb97fd28a0f/renault-logan.webp'],2),
('Chevrolet','Onix Plus 1.0T LT MT',2025,'Sedán','Manual','Nafta',5,2,'Sedán · 4 puertas',ARRAY['Aire acondicionado'],ARRAY['/__l5e/assets-v1/0bf367f8-7b9a-4f79-b467-19a1c00d766e/chevrolet-onix-plus.webp'],3),
('Volkswagen','Polo Track MSI MT G1',2026,'Hatchback','Manual','Nafta',5,2,'Hatchback · 5 puertas',ARRAY['Aire acondicionado'],ARRAY['/__l5e/assets-v1/aebf4138-c818-45c7-b7a9-e7f3c42dabe9/vw-polo-track.webp'],4),
('Renault','Sandero Life 1.6',2025,'Hatchback','Manual','Nafta',5,2,'Hatchback · 5 puertas',ARRAY['Aire acondicionado'],ARRAY['/__l5e/assets-v1/547a8da7-9e19-4f22-a75c-6896da435bdc/renault-sandero.webp'],5);