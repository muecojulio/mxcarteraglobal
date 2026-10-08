import Link from "next/link";

const sections = [
  {
    title: "Activos",
    items: [
      { href: "/sic", icon: "🌐", label: "SIC · Mercado Global" },
      { href: "/etfs", icon: "📉", label: "ETFS" },
      { href: "/fibras", icon: "🏢", label: "FIBRAs" },
      { href: "/markets?tab=bonds", icon: "💵", label: "Bonos" },
      { href: "/markets?tab=commodities", icon: "🛢️", label: "Materias primas" },
    ],
  },
  {
    title: "Herramientas",
    items: [
      { href: "/dividends", icon: "💰", label: "Dividendos" },
      { href: "/calendar", icon: "📅", label: "Calendario" },
      { href: "/ipo", icon: "🚀", label: "Ofertas públicas" },
      { href: "/screener", icon: "🔎", label: "Filtro" },
      { href: "/metrics", icon: "📐", label: "Métricas" },
      { href: "/alerts", icon: "🔔", label: "Alertas de precio" },
      { href: "/analysis", icon: "🧠", label: "Análisis" },
    ],
  },
  {
    title: "Cuenta",
    items: [
      { href: "/install", icon: "📲", label: "Instalación" },
      { href: "/settings", icon: "⚙️", label: "Configuración" },
      { href: "/legal", icon: "📜", label: "Avisos legales" },
    ],
  },
];

export default function MorePage() {
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto">
          <h1 className="text-lg font-bold">Más</h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-6 pb-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
              {section.title}
            </h2>
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              {section.items.map((item, i) => (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-4 min-h-[56px] active:bg-secondary/50 transition-colors ${
                    i !== section.items.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <span className="text-xl w-7 text-center">{item.icon}</span>
                  <span className="font-medium text-sm flex-1">{item.label}</span>
                  <span className="text-muted text-sm">›</span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        <p className="text-center text-xs text-muted pt-2 pb-4">
          MX Cartera Global · seguimiento MXN · SIC · FIBRAs · no somos casa de bolsa
        </p>
      </main>
    </div>
  );
}
