import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  Car,
  Check,
  Gauge,
  MapPin,
  MessageCircle,
  Settings2,
  Snowflake,
  Users,
} from "lucide-react";

import { PageHero } from "@/components/site/page-hero";
import { ReservationCta } from "@/components/site/reservation-cta";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { DateSearch } from "@/components/site/date-search";
import { parseBookingSearch } from "@/lib/booking-search";
import { catalogQuery } from "@/lib/catalog-query";
import { formatMoney } from "@/lib/reservation-logic";
import { toBusinessDate, validateDates } from "@/lib/reservation-logic";
import { getOccupiedPeriods } from "@/lib/availability.functions";
import { fromSearch } from "@/components/site/date-search";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/vehiculos")({
  head: () => ({
    meta: [
      { title: "Vehículos | Del Valle Patagonia Rent a Car" },
      {
        name: "description",
        content: "Conocé las categorías de vehículos de Del Valle para recorrer General Roca, el Alto Valle y la Patagonia.",
      },
      { property: "og:title", content: "Vehículos | Del Valle Patagonia Rent a Car" },
      {
        property: "og:description",
        content: "Encontrá el vehículo adecuado para tus trayectos urbanos y tus viajes por la Patagonia.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://del-valle-road-rentals.lovable.app/vehiculos" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://del-valle-road-rentals.lovable.app/vehiculos" }],
  }),
  validateSearch: parseBookingSearch,
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: VehiclesPage,
});

function VehiclesPage() {
  const search = Route.useSearch();
  const { data } = useSuspenseQuery(catalogQuery);
  const fleet = data.vehicles;
  const dates = fromSearch(search);
  const datesValid = validateDates(dates) === null;
  const availability = useQuery({ queryKey: ["availability", dates], enabled: datesValid, queryFn: () => getOccupiedPeriods({ data: { start: toBusinessDate(dates.pickupDate, dates.pickupTime).toISOString(), end: toBusinessDate(dates.returnDate, dates.returnTime).toISOString() } }), staleTime: 15_000 });
  return (
    <>
      <PageHero
        eyebrow="NUESTRA FLOTA"
        title="Elegí el vehículo para tu recorrido"
        description="Opciones para cada tipo de viaje, con atención personalizada para ayudarte a encontrar la categoría que mejor se adapta a vos."
      />

      <section id="flota" className="mx-auto max-w-7xl scroll-mt-24 px-6 pb-14" aria-labelledby="fleet-title">
        <div className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-bold text-primary">¿Cuándo lo necesitás?</h2>
          <div className="mt-4"><DateSearch key={JSON.stringify(search)} initial={search} /></div>
        </div>
        <div className="mb-7">
          <p className="text-sm font-semibold tracking-[0.2em] text-primary">ELEGÍ TU VEHÍCULO</p>
          <h2 id="fleet-title" className="mt-2 text-3xl font-bold text-primary">
            Opciones para tu próximo viaje
          </h2>
          <div className="mt-3 h-1 w-16 bg-accent" />
        </div>

        <div className="space-y-5">
          {fleet.map((v) => {
            const name = `${v.brand} ${v.model}`;
            const { category, year, transmission } = v;
            const occupied = availability.data?.some((period) => period.vehicle_id === v.id) ?? false;
            return (
            <article
              key={v.id}
              className="grid overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:grid-cols-[250px_minmax(0,1fr)_190px]"
            >
              <div className="flex min-h-48 items-center justify-center border-b border-border bg-secondary p-3 lg:border-b-0 lg:border-r">
                <img
                  src={v.images[0]}
                  alt={`${name} disponible para consultar`}
                  width={900}
                  height={600}
                  loading="lazy"
                  className="h-44 w-full object-contain"
                />
              </div>

              <div className="p-6">
                <span className="inline-flex rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-primary">
                  {category}
                </span>
                <h3 className="mt-3 text-2xl font-bold text-primary">{name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{v.description}</p>

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-primary" />
                    {v.passenger_capacity} pasajeros
                  </span>
                  {v.luggage_capacity != null && (
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4 text-primary" />
                      {v.luggage_capacity} valijas
                    </span>
                  )}
                  {v.fuel_type && (
                    <span className="flex items-center gap-1.5">
                      <Gauge className="h-4 w-4 text-primary" />
                      {v.fuel_type}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Settings2 className="h-4 w-4 text-primary" />
                    {transmission}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-primary" />
                    Año {year}
                  </span>
                  {v.features.map((f) => (
                    <span key={f} className="flex items-center gap-1.5">
                      <Snowflake className="h-4 w-4 text-primary" />
                      {f}
                    </span>
                  ))}
                </div>

                <div className="mt-4">
                  <p className="text-sm font-bold text-foreground">Kilometraje ilimitado</p>
                  {v.guarantee_amount != null && (
                    <p className="text-sm text-muted-foreground">Garantía: {formatMoney(v.guarantee_amount)}</p>
                  )}
                </div>

                <div className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                    Disponibilidad según fechas
                  </span>
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                    Condiciones al reservar
                  </span>
                </div>

                <div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  Retiro en General Roca · Lugar y horario a coordinar
                </div>
              </div>

              <div className="flex flex-col justify-center border-t border-border p-6 lg:border-l lg:border-t-0 lg:text-right">
                <p className="text-sm text-muted-foreground">Precio por día</p>
                <p className="mt-1 font-display text-2xl font-bold text-primary">{formatMoney(v.daily_price)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{occupied ? "Ocupado en las fechas seleccionadas" : availability.isError ? "No se pudo comprobar disponibilidad" : datesValid && availability.isPending ? "Comprobando disponibilidad…" : "Sujeto a confirmación de disponibilidad"}</p>
                {occupied || (datesValid && (availability.isPending || availability.isError)) ? <Button disabled className="mt-5 h-auto whitespace-normal py-2.5">{occupied ? "Elegí otras fechas" : "Disponibilidad pendiente"}</Button> : <Link
                  to="/reservar"
                  search={{ ...search, vehiculo: v.id }}
                  aria-label={`Seleccionar ${name}`}
                  className="mt-5 flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Seleccionar vehículo
                  <ArrowRight className="h-4 w-4 text-accent" />
                </Link>}
              </div>
            </article>
          );
          })}
        </div>
        <p className="mt-5 text-sm text-muted-foreground">Tu solicitud está sujeta a la confirmación de disponibilidad por parte de Del Valle Rent a Car.</p>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="grid gap-6 rounded-xl bg-secondary p-7 md:grid-cols-3">
          <div className="flex items-start gap-3">
            <MapPin className="h-6 w-6 shrink-0 text-primary" />
            <div>
              <h2 className="text-lg font-bold text-primary">Retiro coordinado</h2>
              <p className="mt-1 text-sm text-muted-foreground">Coordiná lugar y horario al momento de reservar.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MessageCircle className="h-6 w-6 shrink-0 text-primary" />
            <div>
              <h2 className="text-lg font-bold text-primary">Atención personalizada</h2>
              <p className="mt-1 text-sm text-muted-foreground">Resolvemos tus dudas antes de confirmar el viaje.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Car className="h-6 w-6 shrink-0 text-primary" />
            <div>
              <h2 className="text-lg font-bold text-primary">Una opción para cada plan</h2>
              <p className="mt-1 text-sm text-muted-foreground">Contanos tu recorrido y te ayudamos a elegir.</p>
            </div>
          </div>
        </div>
      </section>

      <ReservationCta
        title="¿No sabés qué categoría elegir?"
        description="Contanos cuántas personas viajan, cuánto equipaje llevan y qué recorrido tienen en mente."
        label="Pedir asesoramiento"
        to="/contacto"
      />
    </>
  );
}
