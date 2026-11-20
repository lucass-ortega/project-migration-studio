import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Clock } from "lucide-react";
import { useState } from "react";

import { todayInBusinessTz, type BookingSearch } from "@/lib/booking-search";
import { DATES_ERROR_TEXT, TIME_OPTIONS, validateDates } from "@/lib/reservation-logic";

const fieldCls = "h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

export type DateValues = { pickupDate: string; pickupTime: string; returnDate: string; returnTime: string };

export function DateFields({ value, onChange }: { value: DateValues; onChange: (v: DateValues) => void }) {
  const today = todayInBusinessTz();
  const set = (k: keyof DateValues) => (e: { target: { value: string } }) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 text-sm font-medium"><CalendarDays className="h-4 w-4 text-primary" />Fecha de entrega</span>
        <input type="date" required min={today} value={value.pickupDate} onChange={set("pickupDate")} className={fieldCls} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 text-sm font-medium"><Clock className="h-4 w-4 text-primary" />Hora de entrega</span>
        <select value={value.pickupTime} onChange={set("pickupTime")} className={fieldCls}>
          {TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 text-sm font-medium"><CalendarDays className="h-4 w-4 text-primary" />Fecha de devolución</span>
        <input type="date" required min={value.pickupDate || today} value={value.returnDate} onChange={set("returnDate")} className={fieldCls} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 text-sm font-medium"><Clock className="h-4 w-4 text-primary" />Hora de devolución</span>
        <select value={value.returnTime} onChange={set("returnTime")} className={fieldCls}>
          {TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
        </select>
      </label>
    </div>
  );
}

export function toSearch(v: DateValues): BookingSearch {
  return { desde: v.pickupDate, horaDesde: v.pickupTime, hasta: v.returnDate, horaHasta: v.returnTime };
}

export function fromSearch(s: BookingSearch): DateValues {
  return { pickupDate: s.desde ?? "", pickupTime: s.horaDesde ?? "10:00", returnDate: s.hasta ?? "", returnTime: s.horaHasta ?? "10:00" };
}

export function DateSearch({ initial }: { initial?: BookingSearch }) {
  const navigate = useNavigate();
  const [v, setV] = useState<DateValues>(fromSearch(initial ?? {}));
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const err = validateDates(v);
        if (err) return setError(DATES_ERROR_TEXT[err]);
        setError(null);
        navigate({ to: "/vehiculos", search: toSearch(v), hash: "flota" });
      }}
    >
      <DateFields value={v} onChange={setV} />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Ubicación comercial: General Roca, Río Negro. El lugar de entrega lo indicás al reservar.</p>
        <button type="submit" className="flex h-11 items-center gap-2 rounded-md bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90">
          <ArrowRight className="h-5 w-5 text-accent" />Buscar vehículos
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm font-medium text-destructive">{error}</p>}
    </form>
  );
}
