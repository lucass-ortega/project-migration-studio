import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Compass, Map, Route as RouteIcon } from "lucide-react";

import bariloche from "@/assets/bariloche.jpg";
import neuquen from "@/assets/neuquen.jpg";
import roca from "@/assets/roca.jpg";
import { PageHero } from "@/components/site/page-hero";
import { ReservationCta } from "@/components/site/reservation-cta";

export const Route = createFileRoute("/destinos")({
  head: () => ({
    meta: [
      { title: "Destinos | Del Valle Patagonia Rent a Car" },
      {
        name: "description",
        content: "Descubrí General Roca, Neuquén y Bariloche con la libertad de recorrer la Patagonia en tu vehículo de Del Valle.",
      },
      { property: "og:title", content: "Destinos | Del Valle Patagonia Rent a Car" },
      {
        property: "og:description",
        content: "Inspiración para tu próximo recorrido por General Roca, Neuquén, Bariloche y la Patagonia.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://del-valle-road-rentals.lovable.app/destinos" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://del-valle-road-rentals.lovable.app/destinos" }],
  }),
  component: DestinationsPage,
});

const destinations = [
  {
    name: "General Roca",
    image: roca,
    alt: "Vista de General Roca y su entorno natural",
    eyebrow: "ALTO VALLE",
    description: "El punto de partida para recorrer el Alto Valle, descubrir su identidad y salir a conocer la región a tu ritmo.",
  },
  {
    name: "Neuquén",
    image: neuquen,
    alt: "Paisaje urbano y natural de Neuquén",
    eyebrow: "PATAGONIA",
    description: "Una ciudad para combinar paseos, costanera y nuevas rutas, con la comodidad de moverte en tu propio vehículo.",
  },
  {
    name: "Bariloche",
    image: bariloche,
    alt: "Lago y montañas de Bariloche",
    eyebrow: "CORDILLERA",
    description: "Montañas, lagos y caminos para disfrutar en cada estación. Un destino ideal para convertir el trayecto en parte del viaje.",
  },
];

function DestinationsPage() {
  return (
    <>
      <PageHero
        eyebrow="DESTINOS"
        title="La Patagonia se disfruta en ruta"
        description="Elegí un destino, armá tu recorrido y animate a descubrir cada parada con la libertad que te da un vehículo."
      />

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-6 lg:grid-cols-3">
          {destinations.map(({ name, image, alt, eyebrow, description }) => (
            <article key={name} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="relative h-64 overflow-hidden">
                <img
                  src={image}
                  alt={alt}
                  width={1088}
                  height={608}
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                />
                <span className="absolute bottom-4 left-4 rounded-md bg-accent px-3 py-1 text-xs font-semibold tracking-[0.15em] text-accent-foreground">
                  {eyebrow}
                </span>
              </div>
              <div className="p-6">
                <h2 className="text-3xl font-bold text-primary">{name}</h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">{description}</p>
                <Link
                  to="/contacto"
                  className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm font-semibold text-primary hover:text-primary/75"
                >
                  Consultar por este destino
                  <ArrowRight className="h-4 w-4 text-accent" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="rounded-xl bg-secondary p-7 md:p-10">
          <h2 className="text-3xl font-bold text-primary">Tu recorrido, a tu manera</h2>
          <div className="mt-3 h-1 w-16 bg-accent" />
          <div className="mt-7 grid gap-7 md:grid-cols-3">
            <div className="flex gap-3">
              <Map className="h-7 w-7 shrink-0 text-primary" />
              <div>
                <h3 className="font-bold text-primary">Elegí tu destino</h3>
                <p className="mt-1 text-sm text-muted-foreground">Pensá qué lugares querés conocer y cuánto tiempo tenés.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <RouteIcon className="h-7 w-7 shrink-0 text-primary" />
              <div>
                <h3 className="font-bold text-primary">Armá tu ruta</h3>
                <p className="mt-1 text-sm text-muted-foreground">Sumá paradas y organizá el recorrido según tus tiempos.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Compass className="h-7 w-7 shrink-0 text-primary" />
              <div>
                <h3 className="font-bold text-primary">Disfrutá el camino</h3>
                <p className="mt-1 text-sm text-muted-foreground">Movete con libertad y convertí cada tramo en parte de la experiencia.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ReservationCta
        title="¿Ya tenés un destino en mente?"
        description="Contanos tu recorrido y consultanos qué vehículo puede acompañarte en tu próximo viaje."
        label="Planificar mi viaje"
        to="/contacto"
      />
    </>
  );
}
