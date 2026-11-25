import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { Logo } from "./logo";
import { NAV_ITEMS } from "./site-navigation";

export function SiteFooter() {
  return (
    <footer className="bg-navy text-primary-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-6 py-8 text-sm">
        <Link to="/" aria-label="Del Valle Rent a Car — Inicio">
          <Logo light />
        </Link>
        <div className="flex gap-2">
          <MapPin className="h-4 w-4 shrink-0" />
          <div>
            General Roca, Río Negro
            <br />
            Alto Valle, Patagonia
          </div>
        </div>
        <div className="space-y-1">
          <a href="tel:+5492985085908" className="flex gap-2 hover:text-accent">
            <Phone className="h-4 w-4 shrink-0" />
            +54 9 2985 08-5908
          </a>
          <a
            href="https://wa.me/5492985085908"
            target="_blank"
            rel="noreferrer"
            className="flex gap-2 hover:text-accent"
          >
            <MessageCircle className="h-4 w-4 shrink-0" />
            +54 9 2985 08-5908
          </a>
        </div>
        <a href="mailto:reservas@delvallerentacar.com.ar" className="flex gap-2 hover:text-accent">
          <Mail className="h-4 w-4 shrink-0" />
          reservas@delvallerentacar.com.ar
        </a>
        <nav className="flex flex-wrap gap-5" aria-label="Navegación del pie de página">
          {NAV_ITEMS.map((item) => (
            <Link key={item.to} to={item.to} className="hover:text-accent">
              {item.label}
            </Link>
          ))}
        </nav>
        <Link to="/login" className="text-xs text-primary-foreground/60 hover:text-accent">
          Acceso administrativo
        </Link>
        <div className="flex gap-3" aria-label="Redes sociales">
          <Instagram aria-hidden="true" />
          <Facebook aria-hidden="true" />
        </div>
      </div>
    </footer>
  );
}
