"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Inicio", icon: "🏠" },
  { href: "/oportunidad", label: "Contexto", icon: "📐" },
  { href: "/watchlist", label: "Seguimiento", icon: "⭐" },
  { href: "/portfolio", label: "Cartera", icon: "💼" },
  { href: "/more", label: "Más", icon: "☰" },
];

/**
 * Barra de navegación inferior flotante: una cápsula de cristal con la
 * pestaña activa marcada por una píldora con degradado que "salta"
 * al activarse (ver `ui-pop` en globals.css).
 */
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="ui-bottomnav" aria-label="Navegación principal">
      <div className="ui-bottomnav__bar">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`ui-bottomnav__item ${isActive ? "is-active" : "active:bg-secondary"}`}
            >
              <span className="ui-bottomnav__icon" aria-hidden>
                {item.icon}
              </span>
              <span className="ui-bottomnav__label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
