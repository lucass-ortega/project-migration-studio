import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  buildWhatsAppMessage,
  validateDates,
  whatsappUrl,
  type Quote,
} from "./reservation-logic";
import { canonicalRequest, reservationInput } from "./reservation-input";
export { reservationInput } from "./reservation-input";
export type { ReservationInput } from "./reservation-input";

export type PublicVehicle = {
  id: string;
  brand: string;
  model: string;
  year: number;
  category: string;
  transmission: string;
  fuel_type: string | null;
  passenger_capacity: number;
  luggage_capacity: number | null;
  description: string | null;
  features: string[];
  images: string[];
  daily_price: number | null;
};
export type PublicSettings = { whatsapp_number: string | null; deposit_type: string | null; deposit_value: number | null };

export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const { createPublicClient } = await import("./supabase-public.server");
  const sb = createPublicClient();
  const [v, s] = await Promise.all([
    sb
      .from("vehicles")
      .select("id,brand,model,year,category,transmission,fuel_type,passenger_capacity,luggage_capacity,description,features,images,daily_price")
      .eq("is_active", true)
      .order("sort_order"),
    sb.from("public_business_settings").select("whatsapp_number,deposit_type,deposit_value").maybeSingle(),
  ]);
  if (v.error) throw new Error("No se pudieron cargar los vehículos.");
  if (s.error) throw new Error("No se pudo cargar la configuración.");
  const { resolveVehicleImages } = await import("./vehicle-images.server");
  const vehicles: PublicVehicle[] = await Promise.all((v.data ?? []).map(async (r) => ({ ...r, images: await resolveVehicleImages(r.id, r.images), daily_price: r.daily_price == null ? null : Number(r.daily_price) })));
  const settings: PublicSettings = {
    whatsapp_number: s.data?.whatsapp_number ?? null,
    deposit_type: s.data?.deposit_type ?? null,
    deposit_value: s.data?.deposit_value == null ? null : Number(s.data.deposit_value),
  };
  return { vehicles, settings };
});

export type ReservationResult = {
  reservationNumber: string;
  status: string;
  quote: Quote;
  whatsappUrl: string | null;
  message: string;
};

const storedResult = z.object({
  reservationNumber: z.string(), status: z.string(),
  vehicle: z.object({ brand: z.string(), model: z.string(), year: z.number().int() }),
  quote: z.object({ days: z.number().int().positive(), dailyPrice: z.number().nullable(), total: z.number().nullable(), deposit: z.number().nullable(), remaining: z.number().nullable() }),
});

export const createReservation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const parsed = reservationInput.safeParse(input);
    if (!parsed.success) throw new Error("Revisá los datos de la solicitud.");
    return canonicalRequest(parsed.data);
  })
  .handler(async ({ data }): Promise<ReservationResult> => {
    if (validateDates(data)) throw new Error("Las fechas seleccionadas no son válidas.");
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    const result = await sb.rpc("submit_reservation_request", { _request: data });
    if (result.error) {
      const allowed = ["El vehículo seleccionado no está disponible.", "El vehículo está ocupado durante las fechas seleccionadas.", "Las fechas seleccionadas no son válidas.", "La clave de solicitud ya fue utilizada con otros datos."];
      throw new Error(allowed.includes(result.error.message) ? result.error.message : "No se pudo guardar la solicitud. Intentá nuevamente con los mismos datos.");
    }
    const saved = storedResult.safeParse(result.data);
    if (!saved.success) throw new Error("No se pudo recuperar el resumen de la solicitud.");
    const settings = await sb.from("public_business_settings").select("whatsapp_number").maybeSingle();
    const { reservationNumber, status, vehicle, quote } = saved.data;
    const message = buildWhatsAppMessage({
      reservationNumber, customer: data.customer, vehicle,
      pickup: { date: data.pickupDate, time: data.pickupTime, ...data.pickup },
      ret: { date: data.returnDate, time: data.returnTime, ...data.ret },
      quote, notes: data.notes,
    });
    return { reservationNumber, status, quote, message, whatsappUrl: settings.data?.whatsapp_number ? whatsappUrl(settings.data.whatsapp_number, message) : null };
  });
