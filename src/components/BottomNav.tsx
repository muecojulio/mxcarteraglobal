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

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border safe-bottom"
      style={{
        background: "color-mix(in srgb, var(--card) 94%, transparent)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: "var(--shadow-nav)",
      }}
    >
      <div className="flex items-stretch justify-around min-h-[4.5rem] max-w-lg md:max-w-2xl mx-auto px-2 py-2 gap-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 min-h-[56px] gap-1.5 rounded-2xl mx-0.5 px-1 transition-colors ${
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted active:bg-secondary"
              }`}
            >
              <span className="text-[1.65rem] leading-none" aria-hidden>
                {item.icon}
              </span>
              <span className="text-[11px] font-semibold leading-none tracking-wide">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
