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
  const { fx } = useUsdMxn();
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto"><h1 className="text-lg font-bold">MX Cartera Global</h1></div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        <AssetSearch />
        <section>
          <h2 className="text-xs font-semibold text-muted uppercase mb-2">Índices</h2>
          {indicesLoading && !indicesData ? <p className="text-sm text-muted">Cargando…</p> : (indicesData?.indices ?? []).map((idx) => (
            <div key={idx.symbol} className="flex justify-between py-2 border-b border-border text-sm">
              <span>{idx.name}</span>
              <span className={idx.changePercent >= 0 ? "text-success" : "text-danger"}>{formatPercent(idx.changePercent)}</span>
            </div>
          ))}
        </section>
        <section>
          <h2 className="text-xs font-semibold text-muted uppercase mb-2">Watchlist / recientes</h2>
          {quotesLoading && !quotesData ? <p className="text-sm text-muted">Cargando…</p> : (quotesData?.quotes ?? []).map((q) => (
            <Link key={q.symbol} href={`/asset/${encodeURIComponent(q.symbol)}`} className="flex justify-between py-2 border-b border-border text-sm">
              <span>{q.symbol}</span>
              <span>{formatMxn(toMxn(q.price, q.currency, fx?.usdMxn ?? null))} <span className={q.changePercent >= 0 ? "text-success" : "text-danger"}>{formatPercent(q.changePercent)}</span></span>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
