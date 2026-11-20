import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, KeyRound, MessageCircle } from "lucide-react";

import { PageHero } from "@/components/site/page-hero";
import { ReservationCta } from "@/components/site/reservation-cta";

export const Route = createFileRoute("/como-reservar")({
  head: () => ({
    meta: [
      { title: "Cómo reservar | Del Valle Patagonia Rent a Car" },
      {
        name: "description",
        content: "Reservá tu vehículo en simples pasos: contanos tu recorrido, consultá disponibilidad y coordiná el retiro con Del Valle.",
      },
      { property: "og:title", content: "Cómo reservar | Del Valle Patagonia Rent a Car" },
      {
        property: "og:description",
        content: "Conocé los pasos para consultar, confirmar y retirar tu vehículo en General Roca.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://del-valle-road-rentals.lovable.app/como-reservar" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://del-valle-road-rentals.lovable.app/como-reservar" }],
  }),
  component: HowToBookPage,
});

const steps = [
  {
    icon: CalendarDays,
    title: "Contanos tu recorrido",
    description: "Indicanos las fechas, los horarios, el destino y la cantidad de personas que viajan.",
  },
  {
    icon: MessageCircle,
    title: "Consultá disponibilidad",
    description: "Escribinos por WhatsApp o email y recibí las opciones disponibles para tu viaje.",
  },
  {
    icon: CheckCircle2,
    title: "Confirmá tu reserva",
    description: "Revisá la propuesta y coordiná con nuestro equipo los detalles de tu reserva.",
  },
  {
    icon: KeyRound,
    title: "Retirá tu vehículo",
    description: "Acordá el lugar y horario de retiro para comenzar tu recorrido por la Patagonia.",
  },
];

const questions = [
  {
    question: "¿Cómo consulto disponibilidad?",
    answer: "Podés escribirnos por WhatsApp, llamarnos o enviarnos un email desde la página de Contacto. Contanos tus fechas y el recorrido que querés hacer.",
  },
  {
    question: "¿Puedo elegir el lugar y el horario de retiro?",
    answer: "Al realizar tu consulta, contanos dónde y cuándo querés retirar el vehículo. Coordinaremos esos detalles según disponibilidad.",
  },
  {
    question: "¿Qué información necesito para consultar?",
    answer: "Tené a mano las fechas del viaje, la cantidad de pasajeros, el equipaje aproximado y el destino. Así podremos orientarte mejor.",
  },
];

function HowToBookPage() {
  return (
    <>
      <PageHero
        eyebrow="CÓMO RESERVAR"
        title="Tu vehículo, en simples pasos"
        description="Queremos que organizar tu viaje sea tan sencillo como disfrutarlo. Contactanos y coordinemos juntos cada detalle."
      />

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, description }, index) => (
            <article key={title} className="relative rounded-xl border border-border bg-card p-6 shadow-sm">
              <span className="absolute right-5 top-4 font-display text-4xl font-extrabold text-secondary">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="mt-5 text-xl font-bold text-primary">{title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="grid gap-8 rounded-xl bg-secondary p-7 md:grid-cols-[0.8fr_1.2fr] md:p-10">
          <div>
            <p className="text-sm font-semibold tracking-[0.2em] text-primary">ANTES DE CONSULTAR</p>
            <div className="mt-3 h-1 w-14 bg-accent" />
            <h2 className="mt-5 text-3xl font-bold text-primary">Prepará los datos de tu viaje</h2>
            <p className="mt-4 text-muted-foreground">
              Con algunos datos básicos podemos ayudarte a encontrar una opción acorde a tus planes.
            </p>
          </div>
          <div className="space-y-3">
            {questions.map(({ question, answer }) => (
              <details key={question} className="group rounded-lg border border-border bg-card p-5">
                <summary className="cursor-pointer list-none font-semibold text-primary">{question}</summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <ReservationCta
        title="¿Listo para organizar tu viaje?"
        description="Escribinos con tus fechas y destino para consultar las opciones disponibles."
        label="Consultar disponibilidad"
        to="/contacto"
      />
    </>
  );
}
