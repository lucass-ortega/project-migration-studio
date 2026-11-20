import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Menu, X } from "lucide-react";
import { useState } from "react";

import { Logo } from "./logo";
import { NAV_ITEMS } from "./site-navigation";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link to="/" aria-label="Del Valle Rent a Car — Inicio" onClick={() => setOpen(false)}>
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: true }}
              className="pb-1 text-sm font-medium"
              activeProps={{ className: "border-b-2 border-accent text-primary" }}
              inactiveProps={{ className: "transition-colors hover:text-primary" }}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/como-reservar"
            className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          >
            <CalendarDays className="h-4 w-4" />
            Reservar ahora
          </Link>
        </nav>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          className="grid h-11 w-11 place-items-center rounded-md bg-primary text-primary-foreground md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>
      {open && (
        <nav
          id="mobile-navigation"
          aria-label="Navegación móvil"
          className="absolute inset-x-0 top-[66px] z-50 border-t-4 border-accent bg-navy px-6 py-4 shadow-xl animate-in fade-in slide-in-from-top-2 md:hidden"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: true }}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between border-b border-primary-foreground/10 py-3.5 font-medium text-primary-foreground"
              activeProps={{ className: "text-accent" }}
            >
              {item.label}
              <ArrowRight className="h-4 w-4 text-accent" />
            </Link>
          ))}
          <Link
            to="/como-reservar"
            onClick={() => setOpen(false)}
            className="mt-4 flex items-center justify-center gap-2 rounded-md bg-accent py-3 font-semibold text-accent-foreground"
          >
            <CalendarDays className="h-4 w-4" />
            Reservar ahora
          </Link>
        </nav>
      )}
    </>
  );
}
