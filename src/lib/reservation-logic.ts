// Pure, browser- and server-safe booking rules. The server recomputes every amount.
export const BUSINESS_TZ_OFFSET = "-03:00"; // Argentina (no DST)

export const LOCATION_TYPES = [
  { value: "hotel", label: "Hotel" },
  { value: "domicilio", label: "Domicilio particular" },
  { value: "aeropuerto", label: "Aeropuerto" },
  { value: "otro", label: "Otra ubicación" },
] as const;
export type LocationType = (typeof LOCATION_TYPES)[number]["value"];

export const TIME_OPTIONS: string[] = Array.from({ length: 31 }, (_, i) => {
  const mins = 7 * 60 + i * 30;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
});

export function toBusinessDate(date: string, time: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return new Date(NaN);
  const value = new Date(`${date}T${time}:00${BUSINESS_TZ_OFFSET}`);
  if (!Number.isFinite(value.getTime())) return new Date(NaN);
  const local = new Date(value.getTime() - 3 * 3600000).toISOString().slice(0, 10);
  return local === date ? value : new Date(NaN);
}

/** Days billed: every started 24h block counts as one day, minimum 1. */
export function rentalDays(pickup: Date, ret: Date): number {
  const ms = ret.getTime() - pickup.getTime();
  if (!(ms > 0)) return 0;
  return Math.max(1, Math.ceil(ms / 86_400_000));
}

export type DatesError = "missing" | "past" | "order" | "range" | null;
export function validateDates(
  d: { pickupDate?: string; pickupTime?: string; returnDate?: string; returnTime?: string },
  now: Date = new Date(),
): DatesError {
  if (!d.pickupDate || !d.pickupTime || !d.returnDate || !d.returnTime) return "missing";
  const p = toBusinessDate(d.pickupDate, d.pickupTime);
  const r = toBusinessDate(d.returnDate, d.returnTime);
  if (Number.isNaN(p.getTime()) || Number.isNaN(r.getTime())) return "missing";
  if (p.getTime() < now.getTime()) return "past";
  if (r.getTime() <= p.getTime()) return "order";
  if (r.getTime() - p.getTime() > 730 * 86400000) return "range";
  return null;
}

export const DATES_ERROR_TEXT: Record<Exclude<DatesError, null>, string> = {
  missing: "Completá las fechas y horarios de entrega y devolución.",
  past: "La fecha de entrega no puede ser anterior a hoy.",
  order: "La devolución debe ser posterior a la entrega.",
  range: "Elegí un período válido de hasta dos años.",
};

export type DepositSettings = { deposit_type: string | null; deposit_value: number | null };
export type Quote = {
  days: number;
  dailyPrice: number | null;
  total: number | null;
  deposit: number | null;
  remaining: number | null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeQuote(dailyPrice: number | null, days: number, s: DepositSettings | null): Quote {
  const total = dailyPrice != null && days > 0 ? round2(dailyPrice * days) : null;
  let deposit: number | null = null;
  if (total != null && s?.deposit_value != null) {
    if (s.deposit_type === "percent") deposit = round2((total * s.deposit_value) / 100);
    else if (s.deposit_type === "fixed") deposit = Math.min(round2(s.deposit_value), total);
  }
  const remaining = total != null && deposit != null ? round2(total - deposit) : null;
  return { days, dailyPrice, total, deposit, remaining };
}

export function formatMoney(n: number | null): string {
  if (n == null) return "A confirmar";
  return `$${n.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
}

export function formatDateAR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export const locationLabel = (v: string) => LOCATION_TYPES.find((l) => l.value === v)?.label ?? v;

export type WhatsAppSummary = {
  reservationNumber: string;
  customer: { firstName: string; lastName: string; dni: string; phone: string; whatsapp: string; email: string; country: string };
  vehicle: { brand: string; model: string; year: number };
  pickup: { date: string; time: string; type: string; address: string; city: string; reference?: string | null | undefined };
  ret: { date: string; time: string; type: string; address: string; city: string; reference?: string | null | undefined };
  quote: Quote;
  notes?: string | null;
};

export function buildWhatsAppMessage(s: WhatsAppSummary): string {
  const ref = (r?: string | null) => (r ? `\nReferencia: ${r}` : "");
  const days = `${s.quote.days} ${s.quote.days === 1 ? "día" : "días"}`;
  return [
    "*NUEVA SOLICITUD DE ALQUILER*",
    "DEL VALLE RENT A CAR",
    "",
    `Número de solicitud: ${s.reservationNumber}`,
    "",
    "*DATOS DEL CLIENTE*",
    "",
    `Nombre y apellido: ${s.customer.firstName} ${s.customer.lastName}`,
    `DNI: ${s.customer.dni}`,
    `Teléfono: ${s.customer.phone}`,
    `WhatsApp: ${s.customer.whatsapp}`,
    `Email: ${s.customer.email}`,
    `País de residencia: ${s.customer.country}`,
    "",
    "*VEHÍCULO SELECCIONADO*",
    "",
    `${s.vehicle.brand} ${s.vehicle.model}`,
    `Año: ${s.vehicle.year}`,
    "",
    "*DETALLES DEL ALQUILER*",
    "",
    `Fecha de entrega: ${formatDateAR(s.pickup.date)}`,
    `Hora de entrega: ${s.pickup.time}`,
    "",
    `Lugar de entrega: ${locationLabel(s.pickup.type)}.`,
    `Dirección: ${s.pickup.address}, ${s.pickup.city}.${ref(s.pickup.reference)}`,
    "",
    `Fecha de devolución: ${formatDateAR(s.ret.date)}`,
    `Hora de devolución: ${s.ret.time}`,
    "",
    `Lugar de devolución: ${locationLabel(s.ret.type)}.`,
    `Dirección: ${s.ret.address}, ${s.ret.city}.${ref(s.ret.reference)}`,
    "",
    "*RESUMEN ECONÓMICO*",
    "",
    `Duración: ${days}.`,
    `Precio por día: ${formatMoney(s.quote.dailyPrice)}.`,
    `Importe total: ${formatMoney(s.quote.total)}.`,
    "",
    `Seña requerida: ${formatMoney(s.quote.deposit)}.`,
    `Saldo pendiente: ${formatMoney(s.quote.remaining)}.`,
    ...(s.notes ? ["", `*OBSERVACIONES*`, s.notes] : []),
    "",
    "*ESTADO: PENDIENTE DE CONFIRMACIÓN.*",
    "",
    "Quisiera consultar la disponibilidad y coordinar la entrega del vehículo y el pago de la seña.",
  ].join("\n");
}

export function whatsappUrl(number: string | null, message: string): string {
  const digits = (number ?? "").replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
