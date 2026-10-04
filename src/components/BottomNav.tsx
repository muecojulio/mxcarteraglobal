"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
const ITEMS = [
  { href: "/", label: "Inicio" },
  { href: "/portfolio", label: "Cartera" },
  { href: "/dividends", label: "Divs" },
  { href: "/calendar", label: "Agenda" },
  { href: "/settings", label: "Más" },
];
export default function BottomNav() {
  const path = usePathname() || "/";
  const router = useRouter();
  const [bumped, setBumped] = useState<string | null>(null);
  const activeIndex = Math.max(
    0,
    ITEMS.findIndex((item) => (item.href === "/" ? path === "/" : path.startsWith(item.href))),
  );
  useEffect(() => {
    if (!bumped) return;
    const timer = window.setTimeout(() => setBumped(null), 560);
    return () => window.clearTimeout(timer);
  }, [bumped]);
  return (
    <nav className="app-nav safe-bottom" aria-label="Navegación principal">
      <div className="app-nav-grid">
        <span className="app-nav-pill" aria-hidden="true" style={{ transform: `translateX(${activeIndex * 100}%)` }} />
        {ITEMS.map((item) => {
          const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`app-nav-link${bumped === item.href ? " app-nav-bounce" : ""}`}
              onClick={() => {
                setBumped(item.href);
                // Pre-carga la ruta para que el cambio se sienta inmediato en el toque.
                router.prefetch(item.href);
              }}
            >
              <span className="app-nav-dot" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
