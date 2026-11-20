import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

type ReservationCtaProps = {
  title: string;
  description: string;
  label: string;
  to: "/contacto" | "/como-reservar";
};

export function ReservationCta({ title, description, label, to }: ReservationCtaProps) {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-14">
      <div className="flex flex-col items-start justify-between gap-6 rounded-xl bg-navy p-7 text-primary-foreground [box-shadow:var(--shadow-card)] md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
          <p className="mt-2 max-w-2xl text-primary-foreground/85">{description}</p>
        </div>
        <Link
          to={to}
          className="flex shrink-0 items-center gap-2 rounded-md bg-accent px-5 py-3 font-semibold text-accent-foreground"
        >
          {label}
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </section>
  );
}
