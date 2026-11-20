export type BookingSearch = {
  desde?: string;
  horaDesde?: string;
  hasta?: string;
  horaHasta?: string;
  vehiculo?: string;
};

const str = (v: unknown) => (typeof v === "string" && v.length > 0 && v.length < 64 ? v : undefined);

export function parseBookingSearch(s: Record<string, unknown>): BookingSearch {
  const out: BookingSearch = {};
  for (const k of ["desde", "horaDesde", "hasta", "horaHasta", "vehiculo"] as const) {
    const v = str(s[k]);
    if (v) out[k] = v;
  }
  return out;
}

export function todayInBusinessTz(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
}
