import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { PageHero } from "@/components/site/page-hero";
import { ReservationCta } from "@/components/site/reservation-cta";

export const Route = createFileRoute("/contacto")({
  head: () => ({
    meta: [
      { title: "Contacto | Del Valle Patagonia Rent a Car" },
      {
        name: "description",
        content: "Contactá a Del Valle Rent a Car en General Roca por teléfono, WhatsApp o email para consultar por tu próximo vehículo.",
      },
      { property: "og:title", content: "Contacto | Del Valle Patagonia Rent a Car" },
      {
        property: "og:description",
        content: "Estamos en General Roca. Escribinos para consultar disponibilidad y coordinar tu próximo viaje.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://del-valle-road-rentals.lovable.app/contacto" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://del-valle-road-rentals.lovable.app/contacto" }],
  }),
  component: ContactPage,
});

const contactMethods = [
  {
    title: "Llamanos",
    value: "+54 9 2985 08-5908",
    description: "Consultanos por teléfono sobre tu próximo viaje.",
    href: "tel:+5492985085908",
    icon: Phone,
    external: false,
  },
  {
    title: "Escribinos por WhatsApp",
    value: "+54 9 2985 08-5908",
    description: "Contanos tus fechas y destino por mensaje.",
    href: "https://wa.me/5492985085908",
    icon: MessageCircle,
    external: true,
  },
  {
    title: "Enviános un email",
    value: "reservas@delvallerentacar.com.ar",
    description: "Dejanos los detalles de tu consulta por escrito.",
    href: "mailto:reservas@delvallerentacar.com.ar",
    icon: Mail,
    external: false,
  },
];

function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="CONTACTO"
        title="Hablemos de tu próximo viaje"
        description="Consultanos por disponibilidad, categorías de vehículos y detalles de retiro. Estamos para ayudarte a organizar tu recorrido."
      />

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-6 lg:grid-cols-3">
          {contactMethods.map(({ title, value, description, href, icon: Icon, external }) => (
            <a
              key={title}
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noreferrer" : undefined}
              className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary"
            >
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary text-accent">
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="mt-5 text-2xl font-bold text-primary">{title}</h2>
              <p className="mt-3 break-words font-semibold text-foreground">{value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="grid overflow-hidden rounded-xl border border-border bg-card shadow-sm md:grid-cols-2">
          <div className="bg-navy p-7 text-primary-foreground md:p-10">
            <MapPin className="h-9 w-9 text-accent" />
            <h2 className="mt-5 text-3xl font-bold">Estamos en General Roca</h2>
            <p className="mt-4 text-lg">General Roca, Río Negro</p>
            <p className="mt-1 text-primary-foreground/80">Alto Valle, Patagonia</p>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-primary-foreground/80">
              Contactanos para coordinar los detalles de entrega y devolución de tu vehículo.
            </p>
          </div>
          <div className="p-7 md:p-10">
            <CalendarDays className="h-9 w-9 text-primary" />
            <h2 className="mt-5 text-3xl font-bold text-primary">¿Qué datos enviarnos?</h2>
            <ul className="mt-5 space-y-3 text-muted-foreground">
              <li>• Fechas y horarios estimados de retiro y devolución.</li>
              <li>• Cantidad de pasajeros y equipaje aproximado.</li>
              <li>• Destino o recorrido que tenés planeado.</li>
              <li>• Cualquier consulta que quieras resolver antes de viajar.</li>
            </ul>
          </div>
        </div>
      </section>

      <ReservationCta
        title="¿Todavía no elegiste tu vehículo?"
        description="Conocé los pasos para reservar y prepará la información de tu viaje antes de contactarnos."
        label="Ver cómo reservar"
        to="/como-reservar"
      />
    </>
  );
}
