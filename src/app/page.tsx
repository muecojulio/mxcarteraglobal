"use client";

import { HorizontalRail } from "@/components/ui/HorizontalRail";
import { TickerTape, type TickerItem } from "@/components/TickerTape";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import Link from "next/link";
import { useQuotes, useIndices } from "@/lib/market-data/client";
import { AssetSearch } from "@/components/AssetSearch";
import { useUsdMxn, toMxn, formatMxn } from "@/lib/fx";
import { loadWatchlist, loadRecentSymbols } from "@/lib/persist";
import { useHydratedValue, localStorageIdentity } from "@/lib/use-hydrated-value";

/** Constante de módulo: useSyncExternalStore exige un snapshot estable. */
const EMPTY_SYMBOLS: string[] = [];

function formatPrice(n: number) {
  return n.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(n: number) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function greeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { text: "Buenos días", emoji: "🌅" };
  if (h >= 12 && h < 19) return { text: "Buenas tardes", emoji: "🌤️" };
  return { text: "Buenas noches", emoji: "🌙" };
}

export default function HomePage() {
  // Watchlist + recientes, leído durante el render en vez de con setState en un
  // effect (react-hooks/set-state-in-effect).
  const watchSymbols = useHydratedValue<string[]>(
    () =>
      `${localStorageIdentity("marketpulse_watchlist")()}|${localStorageIdentity(
        "mxcg_recent_symbols"
      )()}`,
    () => {
      const wl = loadWatchlist();
      const recent = loadRecentSymbols();
      return [...wl, ...recent.filter((s) => !wl.includes(s))].slice(0, 8);
    },
    EMPTY_SYMBOLS
  );

  const {
    data: indicesData,
    loading: indicesLoading,
  } = useIndices(60_000);

  const {
    data: quotesData,
    loading: quotesLoading,
  } = useQuotes(watchSymbols, 60_000);
  const { fx } = useUsdMxn(120_000);
  const usdMxn = fx?.usdMxn ?? null;

  const indices = indicesData?.indices ?? [];
  const quotes = quotesData?.quotes ?? [];
  const usingReal = indicesData?.usingRealData || quotesData?.usingRealData;

  const saludo = greeting();
  const fecha = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Cinta bursátil: índices + lista de seguimiento (duplicado decorativo
  // de datos ya visibles en pantalla).
  const tickerItems: TickerItem[] = [
    ...indices.map((idx) => ({
      symbol: idx.symbol.replace("^", ""),
      price: formatPrice(idx.price),
      changePercent: idx.changePercent,
      flag: idx.region === "MX" ? "🇲🇽" : "🇺🇸",
    })),
    ...quotes.map((q) => ({
      symbol: q.symbol,
      price: formatPrice(q.price),
      changePercent: q.changePercent,
    })),
  ];

  const upcomingEvents = [
    { title: "Calendario de resultados", date: "Ver Calendario", href: "/calendar", icon: "📅", tile: "ui-tile--blue" },
    { title: "Próximos dividendos", date: "Ver Dividendos", href: "/dividends", icon: "💵", tile: "ui-tile--teal" },
    { title: "Mercados México / EE.UU.", date: "En vivo", href: "/markets", icon: "🌎", tile: "ui-tile--gold" },
  ];

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border safe-top">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="ui-tile ui-tile--teal ui-tile--sm ui-tile--flat text-primary-foreground font-extrabold">
              MX
            </div>
            <h1 className="text-lg font-extrabold tracking-tight">
              <span className="text-gradient">MX Cartera Global</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {usingReal && (
              <span className="text-[10px] font-bold bg-success/15 text-success px-2 py-1 rounded-full inline-flex items-center">
                <span className="relative inline-flex w-1.5 h-1.5 mr-1.5">
                  <span className="ui-ping absolute inline-flex h-full w-full rounded-full bg-success" />
                  <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-success" />
                </span>
                EN VIVO
              </span>
            )}
            <button className="text-muted text-xl" aria-label="Buscar">
              🔍
            </button>
            <button className="text-muted text-xl" aria-label="Notificaciones">
              🔔
            </button>
          </div>
        </div>
      </header>

      {/* Cinta bursátil */}
      {tickerItems.length > 0 && <TickerTape items={tickerItems} />}

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-6">
        <div className="px-1 pt-1 max-w-lg mx-auto w-full">
          <AssetSearch placeholder="Buscar acción, ETF o FIBRA (ticker o nombre)" />
        </div>

        {/* Saludo héroe */}
        <section className="ui-hero ui-shine rounded-2xl p-5">
          <p className="text-sm font-medium opacity-90 capitalize">
            {saludo.emoji} {saludo.text} · {fecha}
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight mt-1">
            Tu dinero, en un vistazo
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm">
              {usingReal ? "● Datos en vivo" : "◦ Datos de ejemplo"}
            </span>
            {usdMxn != null && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm tabular-nums">
                💱 USD/MXN {formatPrice(usdMxn)}
              </span>
            )}
          </div>
        </section>

        {/* Índices principales */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="ui-heading">Índices</h3>
            <Link href="/markets" className="text-primary text-sm font-semibold">
              Ver todos →
            </Link>
          </div>

          {indicesLoading && indices.length === 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="ui-shimmer rounded-xl h-28" />
              ))}
            </div>
          ) : indices.length > 0 ? (
            <HorizontalRail ariaLabel="Índices principales" scrollerClassName="ui-card-carousel">
              {indices.map((idx) => (
                <div
                  key={idx.symbol}
                  className="ui-idx bg-card rounded-xl p-3 pt-4 border border-border shadow-sm"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">
                      {idx.region === "MX" ? "🇲🇽" : "🇺🇸"}
                    </span>
                    <span className="text-xs text-muted font-medium">
                      {idx.symbol.replace("^", "")}
                    </span>
                  </div>
                  <p className="font-semibold text-sm truncate">{idx.name}</p>
                  <p className="text-lg font-extrabold mt-0.5 tabular-nums">
                    <AnimatedNumber value={idx.price} format={formatPrice} />
                  </p>
                  <p
                    className={`inline-flex items-center gap-1 text-xs font-bold mt-1 px-2 py-0.5 rounded-full ${
                      idx.changePercent >= 0
                        ? "text-success bg-success/15"
                        : "text-danger bg-danger/15"
                    }`}
                  >
                    {idx.changePercent >= 0 ? "▲" : "▼"}
                    {formatPercent(idx.changePercent)}
                  </p>
                </div>
              ))}
            </HorizontalRail>
          ) : (
            <p className="text-sm text-muted text-center py-4">
              No se pudieron cargar los índices
            </p>
          )}
        </section>

        {/* Lista de seguimiento rápida */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="ui-heading">Mi lista de seguimiento</h3>
            <Link href="/watchlist" className="text-primary text-sm font-semibold">
              Ver todas →
            </Link>
          </div>

          {quotesLoading && quotes.length === 0 ? (
            <div className="ui-shimmer rounded-xl h-40" />
          ) : quotes.length > 0 ? (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {quotes.map((stock, i) => (
                <Link
                  key={stock.symbol}
                  href={`/asset/${encodeURIComponent(stock.symbol)}`}
                  className={`flex items-center justify-between px-4 py-3 transition-colors active:bg-secondary ${
                    i !== quotes.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="ui-tile ui-tile--blue ui-tile--sm ui-tile--flat font-extrabold text-primary-foreground">
                      {stock.symbol.slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm">{stock.symbol}</p>
                      <p className="text-xs text-muted truncate max-w-[140px]">
                        {stock.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm tabular-nums">
                      {formatMxn(toMxn(stock.price, stock.currency || (stock.region === "MX" ? "MXN" : "USD"), usdMxn))}
                    </p>
                    <p
                      className={`text-xs font-bold ${
                        stock.changePercent >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {formatPercent(stock.changePercent)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted text-center py-4">
              No se pudieron cargar las cotizaciones
            </p>
          )}
        </section>

        {/* Próximos eventos */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="ui-heading">Próximos eventos</h3>
            <Link href="/calendar" className="text-primary text-sm font-semibold">
              Calendario →
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingEvents.map((event, i) => (
              <Link
                key={i}
                href={event.href}
                className="bg-card rounded-xl px-4 py-3 border border-border flex items-center gap-3 active:scale-[0.99] transition-transform"
              >
                <span className={`ui-tile ui-tile--md ${event.tile}`}>
                  {event.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{event.title}</p>
                  <p className="text-xs text-muted">{event.date}</p>
                </div>
                <span className="text-muted" aria-hidden>
                  ›
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Accesos rápidos */}
        <section className="pb-4">
          <h3 className="ui-heading mb-3">Accesos rápidos</h3>
          <div className="grid grid-cols-4 gap-3">
            {[
              { href: "/dividends", icon: "💰", label: "Dividendos", tile: "ui-tile--gold" },
              { href: "/ipo", icon: "🚀", label: "Ofertas públicas", tile: "ui-tile--blue" },
              { href: "/screener", icon: "🔎", label: "Filtro", tile: "ui-tile--teal" },
              { href: "/alerts", icon: "🔔", label: "Alertas", tile: "ui-tile--plum" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="bg-card rounded-xl p-3 border border-border flex flex-col items-center gap-2 active:scale-95 transition-transform"
              >
                <span className={`ui-tile ${item.tile}`}>{item.icon}</span>
                <span className="text-[11px] font-semibold text-center leading-tight">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
