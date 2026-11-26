import { z } from 'zod';
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const text = (max: number) => z.string().trim().min(1).max(max);
const opt = (max: number) => z.string().trim().max(max).optional().nullable();
const location = z.object({type: z.enum(['hotel', 'domicilio', 'aeropuerto', 'otro']),address: text(300), city: text(120), reference: opt(300)});
export const reservationInput = z.object({
  idempotencyKey: z.string().uuid(), vehicleId: z.string().uuid(),
  pickupDate: date, pickupTime: time, returnDate: date, returnTime: time,
  pickup: location, ret: location, sameReturn: z.boolean(),
  customer: z.object({
    firstName: text(80), lastName: text(80),
    dni: z.string().trim().regex(/^[0-9.\-\sA-Za-z]{5,20}$/),
    phone: z.string().trim().regex(/^[0-9+()\-\s]{6,25}$/),
    whatsapp: z.string().trim().regex(/^[0-9+()\-\s]{6,25}$/),
    email: z.string().trim().email().max(200), country: text(80),
  }),notes: opt(1000),
});
export type ReservationInput = z.infer<typeof reservationInput>;
export function canonicalRequest(data: ReservationInput) {
  const pickup = { ...data.pickup, reference: data.pickup.reference || null };
  const ret = data.sameReturn ? pickup : { ...data.ret, reference: data.ret.reference || null };
  return { ...data, pickup, ret, notes: data.notes || null };
}