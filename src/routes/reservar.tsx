import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Info, MessageCircle, Pencil } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { DateFields, fromSearch, type DateValues } from "@/components/site/date-search";
import { parseBookingSearch } from "@/lib/booking-search";
import { catalogQuery } from "@/lib/catalog-query";
import {
  computeQuote,
  DATES_ERROR_TEXT,
  formatDateAR,
  formatMoney,
  locationLabel,
  LOCATION_TYPES,
  rentalDays,
  toBusinessDate,
  validateDates,
  type LocationType,
} from "@/lib/reservation-logic";
import { createReservation, type PublicVehicle, type ReservationResult } from "@/lib/reservations.functions";

export const Route = createFileRoute("/reservar")({
  head: () => ({
    meta: [
      { title: "Reservar vehículo | Del Valle Patagonia Rent a Car" },
      { name: "description", content: "Solicitá tu alquiler en General Roca: elegí fechas, vehículo y lugar de entrega, y enviá la solicitud por WhatsApp." },
      { property: "og:title", content: "Reservar vehículo | Del Valle Rent a Car" },
      { property: "og:description", content: "Armá tu solicitud de alquiler en pocos pasos y coordiná la entrega por WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: parseBookingSearch,
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: ReservePage,
});

const STEPS = ["Fechas", "Vehículo", "Entrega y devolución", "Datos personales", "Resumen", "WhatsApp"];
const inputCls = "h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

type Loc = { type: LocationType | ""; address: string; city: string; reference: string };
type Customer = { firstName: string; lastName: string; dni: string; phone: string; whatsapp: string; email: string; country: string };
const emptyLoc: Loc = { type: "", address: "", city: "General Roca", reference: "" };

function ReservePage() {
  const search = Route.useSearch();
  const { data } = useSuspenseQuery(catalogQuery);
  const submit = useServerFn(createReservation);

  const initialDates = fromSearch(search);
  const initialVehicle = data.vehicles.find((v) => v.id === search.vehiculo)?.id ?? "";
  const datesOk = validateDates(initialDates) === null;
  const [step, setStep] = useState(datesOk ? (initialVehicle ? 2 : 1) : 0);
  const [dates, setDates] = useState<DateValues>(initialDates);
  const [vehicleId, setVehicleId] = useState(initialVehicle);
  const [pickup, setPickup] = useState<Loc>(emptyLoc);
  const [ret, setRet] = useState<Loc>(emptyLoc);
  const [same, setSame] = useState(true);
  const [customer, setCustomer] = useState<Customer>({ firstName: "", lastName: "", dni: "", phone: "", whatsapp: "", email: "", country: "Argentina" });
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<ReservationResult | null>(null);
  const [idemKey] = useState(() => crypto.randomUUID());

  const vehicle = data.vehicles.find((v) => v.id === vehicleId);
  const quote = useMemo(() => {
    if (!vehicle || validateDates(dates)) return null;
    const days = rentalDays(toBusinessDate(dates.pickupDate, dates.pickupTime), toBusinessDate(dates.returnDate, dates.returnTime));
    return computeQuote(vehicle.daily_price, days, data.settings);
  }, [vehicle, dates, data.settings]);
  const retLoc = same ? pickup : ret;

  const go = (n: number) => { setError(null); setStep(n); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const next = () => {
    if (step === 0) {
      const e = validateDates(dates);
      if (e) return setError(DATES_ERROR_TEXT[e]);
    }
    if (step === 1 && !vehicle) return setError("Seleccioná un vehículo para continuar.");
    if (step === 2) {
      const bad = (l: Loc) => !l.type || !l.address.trim() || !l.city.trim();
      if (bad(pickup) || (!same && bad(ret))) return setError("Completá tipo de ubicación, dirección y ciudad.");
    }
    if (step === 3) {
      const c = customer;
      if (Object.values(c).some((v) => !v.trim())) return setError("Completá todos los datos obligatorios.");
      if (!/^\S+@\S+\.\S+$/.test(c.email)) return setError("Ingresá un email válido.");
      if (!/^[0-9.\-\sA-Za-z]{5,20}$/.test(c.dni)) return setError("Ingresá un DNI válido.");
      if (!/^[0-9+()\-\s]{6,25}$/.test(c.phone) || !/^[0-9+()\-\s]{6,25}$/.test(c.whatsapp)) return setError("Ingresá teléfonos válidos (solo números).");
    }
    go(step + 1);
  };

  const confirm = async () => {
    if (sending || !vehicle) return;
    setSending(true);
    setError(null);
    try {
      const r = await submit({
        data: {
          idempotencyKey: idemKey,
          vehicleId: vehicle.id,
          ...dates,
          pickup: { type: pickup.type as LocationType, address: pickup.address, city: pickup.city, reference: pickup.reference || null },
          ret: { type: retLoc.type as LocationType, address: retLoc.address, city: retLoc.city, reference: retLoc.reference || null },
          sameReturn: same,
          customer,
          notes: notes || null,
        },
      });
      setResult(r);
      setStep(5);
      if (r.whatsappUrl) window.open(r.whatsappUrl, "_blank", "noopener");
    } catch (e) {
      console.error(e);
      setError("No pudimos registrar tu solicitud. Revisá los datos e intentá de nuevo.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-secondary/40">
      <section className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-sm font-semibold tracking-[0.2em] text-primary">SOLICITUD DE ALQUILER</p>
        <h1 className="mt-2 text-3xl font-bold text-primary md:text-4xl">Reservá tu vehículo</h1>
        <div className="mt-3 h-1 w-16 bg-accent" />

        <ol className="mt-8 grid grid-cols-6 gap-2" aria-label="Progreso">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-col items-center gap-2 text-center">
              <span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold ${i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground border border-border"}`}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className={`hidden text-xs sm:block ${i === step ? "font-semibold text-primary" : "text-muted-foreground"}`}>{s}</span>
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-xl bg-card p-6 [box-shadow:var(--shadow-card)] md:p-8">
          {step === 0 && (
            <Panel title="¿Cuándo necesitás el vehículo?">
              <DateFields value={dates} onChange={setDates} />
            </Panel>
          )}

          {step === 1 && (
            <Panel title="Elegí tu vehículo">
              <div className="grid gap-4 sm:grid-cols-2">
                {data.vehicles.map((v) => (
                  <VehicleOption key={v.id} v={v} selected={v.id === vehicleId} onSelect={() => setVehicleId(v.id)} />
                ))}
              </div>
              <Notice>Tu solicitud está sujeta a la confirmación de disponibilidad por parte de Del Valle Rent a Car.</Notice>
            </Panel>
          )}

          {step === 2 && (
            <Panel title="Lugar de entrega y devolución">
              <Notice>La entrega y devolución del vehículo se coordinan personalmente con nuestro equipo. Podés indicarnos el lugar que te resulte más conveniente y confirmaremos los detalles por WhatsApp.</Notice>
              <LocationForm title="Lugar de entrega" value={pickup} onChange={setPickup} />
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={same} onChange={(e) => setSame(e.target.checked)} className="h-4 w-4 accent-primary" />
                Devolveré el vehículo en el mismo lugar de entrega
              </label>
              {!same && <LocationForm title="Lugar de devolución" value={ret} onChange={setRet} />}
            </Panel>
          )}

          {step === 3 && (
            <Panel title="Tus datos">
              <div className="grid gap-4 sm:grid-cols-2">
                {([
                  ["firstName", "Nombre", "text", "given-name"],
                  ["lastName", "Apellido", "text", "family-name"],
                  ["dni", "DNI", "text", "off"],
                  ["phone", "Teléfono", "tel", "tel"],
                  ["whatsapp", "WhatsApp", "tel", "tel"],
                  ["email", "Correo electrónico", "email", "email"],
                  ["country", "País de residencia", "text", "country-name"],
                ] as const).map(([k, label, type, ac]) => (
                  <label key={k} className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">{label} *</span>
                    <input type={type} autoComplete={ac} value={customer[k]} onChange={(e) => setCustomer({ ...customer, [k]: e.target.value })} className={inputCls} />
                  </label>
                ))}
                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-sm font-medium">Observaciones adicionales (opcional)</span>
                  <textarea rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputCls} h-auto py-2`} />
                </label>
              </div>
            </Panel>
          )}

          {step === 4 && vehicle && quote && (
            <Panel title="Revisá tu solicitud">
              <div className="grid gap-4 md:grid-cols-2">
                <SummaryBox title="Datos del cliente" onEdit={() => go(3)}>
                  <Row k="Nombre" v={`${customer.firstName} ${customer.lastName}`} />
                  <Row k="DNI" v={customer.dni} />
                  <Row k="Teléfono" v={customer.phone} />
                  <Row k="WhatsApp" v={customer.whatsapp} />
                  <Row k="Email" v={customer.email} />
                </SummaryBox>
                <SummaryBox title="Vehículo" onEdit={() => go(1)}>
                  <div className="flex items-center gap-3">
                    <img src={vehicle.images[0]} alt={`${vehicle.brand} ${vehicle.model}`} className="h-16 w-24 object-contain" />
                    <div><p className="font-semibold text-primary">{vehicle.brand} {vehicle.model}</p><p className="text-sm text-muted-foreground">Año {vehicle.year}</p></div>
                  </div>
                </SummaryBox>
                <SummaryBox title="Entrega" onEdit={() => go(2)}>
                  <Row k="Fecha" v={`${formatDateAR(dates.pickupDate)} · ${dates.pickupTime}`} />
                  <LocRows l={pickup} />
                </SummaryBox>
                <SummaryBox title="Devolución" onEdit={() => go(2)}>
                  <Row k="Fecha" v={`${formatDateAR(dates.returnDate)} · ${dates.returnTime}`} />
                  <LocRows l={retLoc} />
                </SummaryBox>
              </div>
              <QuoteBox quote={quote} />
              {notes && <p className="text-sm text-muted-foreground"><b>Observaciones:</b> {notes}</p>}
              <div className="flex justify-start"><button type="button" onClick={() => go(0)} className="flex items-center gap-1 text-sm font-semibold text-primary"><Pencil className="h-4 w-4" />Editar fechas</button></div>
              <Notice>No se realiza ningún pago online. La seña y el pago se coordinan directamente con Del Valle Rent a Car por WhatsApp.</Notice>
            </Panel>
          )}

          {step === 5 && result && (
            <div className="space-y-5 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
              <h2 className="text-2xl font-bold text-primary">¡Tu solicitud fue registrada correctamente!</h2>
              <p className="font-display text-3xl font-bold text-primary">{result.reservationNumber}</p>
              <div className="mx-auto max-w-lg space-y-1 rounded-lg bg-secondary p-5 text-left text-sm">
                <Row k="Vehículo" v={vehicle ? `${vehicle.brand} ${vehicle.model}` : ""} />
                <Row k="Fechas" v={`${formatDateAR(dates.pickupDate)} ${dates.pickupTime} → ${formatDateAR(dates.returnDate)} ${dates.returnTime}`} />
                <Row k="Entrega" v={`${locationLabel(pickup.type)} · ${pickup.address}, ${pickup.city}`} />
                <Row k="Devolución" v={`${locationLabel(retLoc.type)} · ${retLoc.address}, ${retLoc.city}`} />
                <Row k="Importe total" v={formatMoney(result.quote.total)} />
                <Row k="Seña requerida" v={formatMoney(result.quote.deposit)} />
                <Row k="Estado" v="Pendiente de confirmación" />
              </div>
              <p className="mx-auto max-w-xl text-muted-foreground">Para completar tu solicitud, enviá el mensaje que preparamos en WhatsApp. Nuestro equipo verificará la disponibilidad del vehículo y se comunicará con vos para coordinar la entrega, devolución y pago de la seña.</p>
              {result.whatsappUrl ? (
                <a href={result.whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 font-semibold text-accent-foreground">
                  <MessageCircle className="h-5 w-5" />Abrir WhatsApp
                </a>
              ) : (
                <p className="text-sm text-destructive">El número de WhatsApp todavía no está configurado. Comunicate por los medios de contacto.</p>
              )}
              <div><Link to="/" className="text-sm font-semibold text-primary">Volver al inicio</Link></div>
            </div>
          )}

          {error && <p role="alert" className="mt-5 text-sm font-medium text-destructive">{error}</p>}

          {step < 5 && (
            <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-6">
              {step > 0 ? (
                <button type="button" onClick={() => go(step - 1)} className="flex items-center gap-2 rounded-md border border-input px-4 py-2.5 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" />Volver</button>
              ) : <span />}
              {step < 4 ? (
                <button type="button" onClick={next} className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Continuar<ArrowRight className="h-4 w-4 text-accent" /></button>
              ) : (
                <button type="button" onClick={confirm} disabled={sending} className="flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60">
                  <MessageCircle className="h-4 w-4" />{sending ? "Registrando…" : "Confirmar datos y enviar por WhatsApp"}
                </button>
              )}
            </div>
          )}
        </div>
        {quote && step > 0 && step < 4 && vehicle && (
          <p className="mt-4 text-center text-sm text-muted-foreground">{vehicle.brand} {vehicle.model} · {quote.days} {quote.days === 1 ? "día" : "días"} · Total estimado {formatMoney(quote.total)}</p>
        )}
      </section>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <div className="space-y-5"><h2 className="text-2xl font-bold text-primary">{title}</h2>{children}</div>;
}
function Notice({ children }: { children: ReactNode }) {
  return <p className="flex gap-2 rounded-lg bg-secondary p-4 text-sm text-foreground"><Info className="h-5 w-5 shrink-0 text-primary" />{children}</p>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <p className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">{k}</span><span className="text-right font-medium">{v}</span></p>;
}
function LocRows({ l }: { l: Loc }) {
  return (<><Row k="Tipo" v={locationLabel(l.type)} /><Row k="Dirección" v={`${l.address}, ${l.city}`} />{l.reference && <Row k="Referencias" v={l.reference} />}</>);
}
function SummaryBox({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <div className="space-y-2 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between"><h3 className="font-bold text-primary">{title}</h3><button type="button" onClick={onEdit} className="flex items-center gap-1 text-xs font-semibold text-primary"><Pencil className="h-3.5 w-3.5" />Editar</button></div>
      {children}
    </div>
  );
}
function QuoteBox({ quote }: { quote: NonNullable<ReturnType<typeof computeQuote>> }) {
  return (
    <div className="space-y-2 rounded-lg bg-navy p-5 text-primary-foreground">
      <h3 className="font-bold">Resumen económico</h3>
      {[
        ["Cantidad de días", String(quote.days)],
        ["Precio por día", formatMoney(quote.dailyPrice)],
        ["Subtotal del alquiler", formatMoney(quote.total)],
        ["Importe total", formatMoney(quote.total)],
        ["Seña requerida", formatMoney(quote.deposit)],
        ["Saldo pendiente", formatMoney(quote.remaining)],
      ].map(([k, v]) => (
        <p key={k} className="flex justify-between text-sm"><span className="text-primary-foreground/80">{k}</span><span className="font-semibold">{v}</span></p>
      ))}
    </div>
  );
}
function VehicleOption({ v, selected, onSelect }: { v: PublicVehicle; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} className={`flex items-center gap-4 rounded-lg border-2 p-4 text-left transition-colors ${selected ? "border-primary bg-secondary" : "border-border hover:border-primary/50"}`}>
      <img src={v.images[0]} alt={`${v.brand} ${v.model}`} className="h-16 w-24 shrink-0 object-contain" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-primary">{v.brand} {v.model}</p>
        <p className="text-xs text-muted-foreground">{v.category} · {v.transmission} · {v.passenger_capacity} pasajeros · Año {v.year}</p>
        <p className="mt-1 text-sm font-semibold">{formatMoney(v.daily_price)} / día</p>
      </div>
      {selected && <Check className="h-5 w-5 shrink-0 text-primary" />}
    </button>
  );
}
function LocationForm({ title, value, onChange }: { title: string; value: Loc; onChange: (l: Loc) => void }) {
  return (
    <fieldset className="space-y-4 rounded-lg border border-border p-4">
      <legend className="px-1 font-bold text-primary">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Tipo de ubicación *</span>
          <select value={value.type} onChange={(e) => onChange({ ...value, type: e.target.value as LocationType })} className={inputCls}>
            <option value="">Seleccionar</option>
            {LOCATION_TYPES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Ciudad *</span>
          <input value={value.city} onChange={(e) => onChange({ ...value, city: e.target.value })} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-sm font-medium">Dirección completa *</span>
          <input value={value.address} onChange={(e) => onChange({ ...value, address: e.target.value })} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-sm font-medium">Referencias adicionales (opcional)</span>
          <input value={value.reference} onChange={(e) => onChange({ ...value, reference: e.target.value })} className={inputCls} />
        </label>
      </div>
    </fieldset>
  );
}
