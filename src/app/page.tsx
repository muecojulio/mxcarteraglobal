"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuotes, useIndices } from "@/lib/market-data/client";
import { AssetSearch } from "@/components/AssetSearch";
import { useUsdMxn, toMxn, formatMxn } from "@/lib/fx";
import { loadWatchlist, loadRecentSymbols } from "@/lib/persist";
function formatPercent(n: number) { return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`; }
export default function HomePage() {
  const [watchSymbols, setWatchSymbols] = useState<string[]>([]);
  useEffect(() => {
    const wl = loadWatchlist();
    const recent = loadRecentSymbols();
    setWatchSymbols([...wl, ...recent.filter((s) => !wl.includes(s))].slice(0, 8));
  }, []);
  const { data: indicesData, loading: indicesLoading } = useIndices(60_000);
  const { data: quotesData, loading: quotesLoading } = useQuotes(watchSymbols, 60_000);
  const { fx } = useUsdMxn(120_000);
  const indices = indicesData?.indices ?? [];
  const quotes = quotesData?.quotes ?? [];
  const usingReal = !!(indicesData?.usingRealData || quotesData?.usingRealData);
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/90 border-b border-border safe-top">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">MP</div>
            <h1 className="text-lg font-bold tracking-tight">MX Cartera Global</h1>
          </div>
          {usingReal ? <span className="text-[10px] font-medium bg-success/15 text-success px-2 py-0.5 rounded-full">EN VIVO</span> : null}
        </div>
      </header>
      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-6">
        <AssetSearch placeholder="Buscar acción, ETF o FIBRA (ticker o nombre)" />
        <section>
          <p className="text-muted text-sm">Mercados</p>
          <h2 className="text-xl font-semibold">{usingReal ? "Datos en vivo" : "Datos de ejemplo"}</h2>
        </section>
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-muted uppercase tracking-wide">Índices</h3>
            <Link href="/calendar" className="text-primary text-sm font-medium">Agenda</Link>
          </div>
          {indicesLoading && indices.length === 0 ? (
            <div className="grid grid-cols-2 gap-3">{[1, 2, 3, 4].map((i) => <div key={i} className="bg-card rounded-xl border border-border h-24 animate-pulse" />)}</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {indices.map((idx) => (
                <div key={idx.symbol} className="bg-card rounded-xl p-3 border border-border">
                  <p className="text-xs text-muted truncate">{idx.name}</p>
                  <p className={`text-sm font-semibold ${idx.changePercent >= 0 ? "text-success" : "text-danger"}`}>{formatPercent(idx.changePercent)}</p>
                </div>
              ))}
            </div>
          )}
        </section>
        <section>
          <h3 className="font-semibold text-sm text-muted uppercase tracking-wide mb-2">Watchlist / recientes</h3>
          {quotesLoading && quotes.length === 0 ? <p className="text-sm text-muted">Cargando…</p> : quotes.map((q) => (
            <Link key={q.symbol} href={`/asset/${encodeURIComponent(q.symbol)}`} className="flex justify-between py-2 border-b border-border text-sm">
              <span>{q.symbol}</span>
              <span>{formatMxn(toMxn(q.price, q.currency, fx?.usdMxn ?? null))} <span className={q.changePercent >= 0 ? "text-success" : "text-danger"}>{formatPercent(q.changePercent)}</span></span>
            </Link>
          ))}
        </section>
        <section className="grid grid-cols-1 gap-2 text-sm">
          <Link href="/calendar" className="bg-card border border-border rounded-xl p-3">Calendario de resultados</Link>
          <Link href="/dividends" className="bg-card border border-border rounded-xl p-3">Próximos dividendos</Link>
          <Link href="/portfolio" className="bg-card border border-border rounded-xl p-3">Mercados México / EE.UU.</Link>
        </section>
      </main>
    </div>
  );
}
