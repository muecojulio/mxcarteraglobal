"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuotes, useIndices } from "@/lib/market-data/client";
import { AssetSearch } from "@/components/AssetSearch";
import { useUsdMxn, toMxn, formatMxn } from "@/lib/fx";
import { loadWatchlist, loadRecentSymbols } from "@/lib/persist";

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

export default function HomePage() {
  const [watchSymbols, setWatchSymbols] = useState<string[]>([]);

  useEffect(() => {
    const wl = loadWatchlist();
    const recent = loadRecentSymbols();
    const merged = [...wl, ...recent.filter((s) => !wl.includes(s))];
    setWatchSymbols(merged.slice(0, 8));
  }, []);

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

  const upcomingEvents = [
    { title: "Calendario de resultados", date: "Ver Calendario", type: "earnings" },
    { title: "Próximos dividendos", date: "Ver Dividendos", type: "dividend" },
    { title: "Mercados México / EE.UU.", date: "En vivo", type: "market" },
  ];

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border safe-top">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              MP
            </div>
            <h1 className="text-lg font-bold tracking-tight">MX Cartera Global</h1>
          </div>
          <div className="flex items-center gap-3">
            {usingReal && (
              <span className="text-[10px] font-medium bg-success/15 text-success px-2 py-0.5 rounded-full">
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

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-6">
        <div className="px-4 pt-3 pb-1 max-w-lg mx-auto w-full">
          <AssetSearch placeholder="Buscar acción, ETF o FIBRA (ticker o nombre)" />
        </div>

        {/* Saludo */}
        <section>
          <p className="text-muted text-sm">Mercados</p>
          <h2 className="text-xl font-semibold">
            {usingReal ? "Datos en vivo" : "Datos de ejemplo"}
          </h2>
        </section>

        {/* Índices principales */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-muted uppercase tracking-wide">
              Índices
            </h3>
            <Link href="/markets" className="text-primary text-sm font-medium">
              Ver todos
            </Link>
          </div>

          {indicesLoading && indices.length === 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-card rounded-xl p-3 border border-border h-24 animate-pulse"
                />
              ))}
            </div>
          ) : indices.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {indices.map((idx) => (
                <div
                  key={idx.symbol}
                  className="bg-card rounded-xl p-3 border border-border shadow-sm"
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
                  <p className="text-lg font-bold mt-0.5">
                    {formatPrice(idx.price)}
                  </p>
                  <p
                    className={`text-sm font-medium ${
                      idx.changePercent >= 0 ? "text-success" : "text-danger"
                    }`}
                  >
                    {formatPercent(idx.changePercent)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted text-center py-4">
              No se pudieron cargar los índices
            </p>
          )}
        </section>

        {/* Lista de seguimiento rápida */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-muted uppercase tracking-wide">
              Mi lista de seguimiento
            </h3>
            <Link href="/watchlist" className="text-primary text-sm font-medium">
              Ver todas
            </Link>
          </div>

          {quotesLoading && quotes.length === 0 ? (
            <div className="bg-card rounded-xl border border-border h-40 animate-pulse" />
          ) : quotes.length > 0 ? (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {quotes.map((stock, i) => (
                <Link
                  key={stock.symbol}
                  href={`/asset/${encodeURIComponent(stock.symbol)}`}
                  className={`flex items-center justify-between px-4 py-3 ${
                    i !== quotes.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div>
                    <p className="font-semibold text-sm">{stock.symbol}</p>
                    <p className="text-xs text-muted truncate max-w-[140px]">
                      {stock.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      {formatMxn(toMxn(stock.price, stock.currency || (stock.region === "MX" ? "MXN" : "USD"), usdMxn))}
                    </p>
                    <p
                      className={`text-xs font-medium ${
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
            <h3 className="font-semibold text-sm text-muted uppercase tracking-wide">
              Próximos eventos
            </h3>
            <Link href="/calendar" className="text-primary text-sm font-medium">
              Calendario
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingEvents.map((event, i) => (
              <div
                key={i}
                className="bg-card rounded-xl px-4 py-3 border border-border flex items-center gap-3"
              >
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    event.type === "earnings"
                      ? "bg-primary"
                      : event.type === "dividend"
                      ? "bg-success"
                      : "bg-warning"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{event.title}</p>
                  <p className="text-xs text-muted">{event.date}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Accesos rápidos */}
        <section className="pb-4">
          <h3 className="font-semibold text-sm text-muted uppercase tracking-wide mb-3">
            Accesos rápidos
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {[
              { href: "/dividends", icon: "💰", label: "Dividendos" },
              { href: "/ipo", icon: "🚀", label: "Ofertas públicas" },
              { href: "/screener", icon: "🔎", label: "Filtro" },
              { href: "/alerts", icon: "🔔", label: "Alertas" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="bg-card rounded-xl p-3 border border-border flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-[11px] font-medium text-center leading-tight">
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
