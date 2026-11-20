import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import {
  buildWhatsAppMessage,
  computeQuote,
  rentalDays,
  toBusinessDate,
  validateDates,
  whatsappUrl,
  type Quote,
} from "./reservation-logic";

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

function publicClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [v, s] = await Promise.all([
    sb
      .from("vehicles")
      .select("id,brand,model,year,category,transmission,fuel_type,passenger_capacity,luggage_capacity,description,features,images,daily_price")
      .eq("is_active", true)
      .order("sort_order"),
    sb.from("business_settings").select("whatsapp_number,deposit_type,deposit_value").eq("id", 1).maybeSingle(),
  ]);
  if (v.error) throw new Error(`No se pudieron cargar los vehículos: ${v.error.message}`);
  if (s.error) throw new Error(`No se pudo cargar la configuración: ${s.error.message}`);
  const vehicles: PublicVehicle[] = (v.data ?? []).map((r) => ({ ...r, daily_price: r.daily_price == null ? null : Number(r.daily_price) }));
  const settings: PublicSettings = {
    whatsapp_number: s.data?.whatsapp_number ?? null,
    deposit_type: s.data?.deposit_type ?? null,
    deposit_value: s.data?.deposit_value == null ? null : Number(s.data.deposit_value),
  };
  return { vehicles, settings };
});

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const text = (max: number) => z.string().trim().min(1).max(max);
const opt = (max: number) => z.string().trim().max(max).optional().nullable();
const loc = z.object({
  type: z.enum(["hotel", "domicilio", "aeropuerto", "otro"]),
  address: text(300),
  city: text(120),
  reference: opt(300),
});

export const reservationInput = z.object({
  idempotencyKey: z.string().uuid(),
  vehicleId: z.string().uuid(),
  pickupDate: date,
  pickupTime: time,
  returnDate: date,
  returnTime: time,
  pickup: loc,
  ret: loc,
  sameReturn: z.boolean(),
  customer: z.object({
    firstName: text(80),
    lastName: text(80),
    dni: z.string().trim().regex(/^[0-9.\-\sA-Za-z]{5,20}$/),
    phone: z.string().trim().regex(/^[0-9+()\-\s]{6,25}$/),
    whatsapp: z.string().trim().regex(/^[0-9+()\-\s]{6,25}$/),
    email: z.string().trim().email().max(200),
    country: text(80),
  }),
  notes: opt(1000),
});
export type ReservationInput = z.infer<typeof reservationInput>;

export type ReservationResult = {
  reservationNumber: string;
  status: string;
  quote: Quote;
  whatsappUrl: string | null;
  message: string;
};

export const createReservation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => reservationInput.parse(input))
  .handler(async ({ data }): Promise<ReservationResult> => {
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");

    const dateErr = validateDates(data);
    if (dateErr) throw new Error("Las fechas seleccionadas no son válidas.");

    const [veh, set] = await Promise.all([
      sb.from("vehicles").select("*").eq("id", data.vehicleId).eq("is_active", true).maybeSingle(),
      sb.from("business_settings").select("*").eq("id", 1).maybeSingle(),
    ]);
    if (veh.error) throw new Error(veh.error.message);
    if (!veh.data) throw new Error("El vehículo seleccionado no está disponible.");
    if (set.error) throw new Error(set.error.message);
    const vehicle = veh.data;
    const settings = set.data;

    const pickupAt = toBusinessDate(data.pickupDate, data.pickupTime);
    const returnAt = toBusinessDate(data.returnDate, data.returnTime);
    const days = rentalDays(pickupAt, returnAt);
    const quote = computeQuote(vehicle.daily_price == null ? null : Number(vehicle.daily_price), days, {
      deposit_type: settings?.deposit_type ?? null,
      deposit_value: settings?.deposit_value == null ? null : Number(settings.deposit_value),
    });
    const ret = data.sameReturn ? data.pickup : data.ret;

    const build = (reservationNumber: string, status: string): ReservationResult => {
      const message = buildWhatsAppMessage({
        reservationNumber,
        customer: data.customer,
        vehicle: { brand: vehicle.brand, model: vehicle.model, year: vehicle.year },
        pickup: { date: data.pickupDate, time: data.pickupTime, ...data.pickup },
        ret: { date: data.returnDate, time: data.returnTime, ...ret },
        quote,
        notes: data.notes ?? null,
      });
      return {
        reservationNumber,
        status,
        quote,
        message,
        whatsappUrl: settings?.whatsapp_number ? whatsappUrl(settings.whatsapp_number, message) : null,
      };
    };

    // Duplicate submit (double click / retry): return the already stored request.
    const existing = await sb.from("reservations").select("reservation_number,status").eq("idempotency_key", data.idempotencyKey).maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data) return build(existing.data.reservation_number, existing.data.status);

    // Associate with an existing customer with the same DNI + email, otherwise create one.
    const c = data.customer;
    const found = await sb.from("customers").select("id").eq("dni", c.dni).ilike("email", c.email).limit(1).maybeSingle();
    if (found.error) throw new Error(found.error.message);
    let customerId = found.data?.id;
    const customerRow = { first_name: c.firstName, last_name: c.lastName, dni: c.dni, phone: c.phone, whatsapp: c.whatsapp, email: c.email, country: c.country };
    if (customerId) {
      const up = await sb.from("customers").update(customerRow).eq("id", customerId);
      if (up.error) throw new Error(up.error.message);
    } else {
      const ins = await sb.from("customers").insert(customerRow).select("id").single();
      if (ins.error) throw new Error(ins.error.message);
      customerId = ins.data.id;
    }

    const num = await sb.rpc("next_reservation_number");
    if (num.error || !num.data) throw new Error(num.error?.message ?? "No se pudo generar el número de solicitud.");

    const ins = await sb
      .from("reservations")
      .insert({
        reservation_number: num.data,
        idempotency_key: data.idempotencyKey,
        customer_id: customerId,
        vehicle_id: vehicle.id,
        vehicle_snapshot: {
          brand: vehicle.brand, model: vehicle.model, year: vehicle.year, category: vehicle.category,
          transmission: vehicle.transmission, fuel_type: vehicle.fuel_type, images: vehicle.images,
          daily_price: vehicle.daily_price,
        },
        pickup_datetime: pickupAt.toISOString(),
        return_datetime: returnAt.toISOString(),
        pickup_location_type: data.pickup.type,
        pickup_address: data.pickup.address,
        pickup_city: data.pickup.city,
        pickup_reference: data.pickup.reference || null,
        return_location_type: ret.type,
        return_address: ret.address,
        return_city: ret.city,
        return_reference: ret.reference || null,
        same_return_location: data.sameReturn,
        duration_days: days,
        daily_price_snapshot: quote.dailyPrice,
        total_amount: quote.total,
        deposit_amount: quote.deposit,
        remaining_amount: quote.remaining,
        customer_notes: data.notes || null,
      })
      .select("reservation_number,status")
      .single();
    if (ins.error) {
      if (ins.error.code === "23505") {
        const again = await sb.from("reservations").select("reservation_number,status").eq("idempotency_key", data.idempotencyKey).single();
        if (!again.error) return build(again.data.reservation_number, again.data.status);
      }
      throw new Error(ins.error.message);
    }
    return build(ins.data.reservation_number, ins.data.status);
  });
