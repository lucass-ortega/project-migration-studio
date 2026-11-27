import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Car } from "lucide-react";

import { DateSearch } from "@/components/site/date-search";


import roca from "@/assets/roca.jpg";
import neuquen from "@/assets/neuquen.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Del Valle Rent a Car — Tu próximo destino empieza acá" },
      { name: "description", content: "Alquilá tu vehículo en General Roca, Alto Valle y Patagonia de forma simple y segura." },
      { property: "og:title", content: "Del Valle Rent a Car" },
      { property: "og:description", content: "Alquiler de autos en General Roca, Alto Valle y Patagonia." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://del-valle-road-rentals.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://del-valle-road-rentals.lovable.app/" }],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <section className="relative">
        <img
          src="/renault-rumbo-a-los-andes.jpg"
          alt="Renault azul rumbo a los Andes"
          width={1774}
          height={887}
          fetchPriority="high"
          decoding="async"
          className="h-[480px] w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy/85 via-navy/40 to-transparent" />
        <div className="absolute inset-0 mx-auto max-w-7xl px-6 pt-14 text-primary-foreground">
          <p className="text-sm tracking-[0.25em]">GENERAL ROCA · ALTO VALLE · PATAGONIA</p>
          <div className="mt-3 h-1 w-14 bg-accent" />
          <h1 className="mt-5 max-w-xl text-5xl font-extrabold leading-[0.95] md:text-6xl">Tu próximo destino empieza acá</h1>
          <p className="mt-4 max-w-sm text-xl">Alquilá tu vehículo de forma simple, segura y sin complicaciones.</p>
        </div>
      </section>

      <div className="relative mx-auto -mt-24 max-w-6xl px-6">
        <div className="rounded-xl bg-card p-7 [box-shadow:var(--shadow-card)]">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-primary"><Car className="h-6 w-6" />Encontrá tu próximo vehículo</h2>
          <div className="mt-5"><DateSearch /></div>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <h2 className="text-3xl font-bold text-primary">Destinos populares</h2>
        <div className="mt-3 h-1 w-16 bg-accent" />
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {[["General Roca", roca], ["Neuquén", neuquen]].map(([n, img]) => (
            <Link key={n} to="/destinos" className="group relative h-48 overflow-hidden rounded-xl">
              <img src={img} alt={n} loading="lazy" width={1088} height={608} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/80 to-transparent" />
              <span className="absolute bottom-4 left-5 font-display text-3xl font-bold text-primary-foreground">{n}</span>
              <ArrowRight className="absolute bottom-5 right-5 h-7 w-7 text-accent" />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
