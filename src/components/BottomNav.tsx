"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const ITEMS = [
  { href: "/", label: "Inicio" },
  { href: "/portfolio", label: "Cartera" },
  { href: "/dividends", label: "Divs" },
  { href: "/calendar", label: "Agenda" },
  { href: "/settings", label: "Más" },
];
export default function BottomNav() {
  const path = usePathname() || "/";
  return (
    <nav aria-label="Navegación principal" className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 safe-bottom">
      <div className="max-w-lg mx-auto grid grid-cols-5">
        {ITEMS.map((item) => {
          const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex items-center justify-center text-xs font-semibold min-h-12 ${active ? "text-primary" : "text-muted"}`}>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
