"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuotes, useIndices } from "@/lib/market-data/client";
import { AssetSearch } from "@/components/AssetSearch";
import { useUsdMxn, toMxn, formatMxn } from "@/lib/fx";
import { loadWatchlist, loadRecentSymbols } from "@/lib/persist";
function formatPrice(n: number) { return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
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
  const usdMxn = fx?.usdMxn ?? null;
  const indices = indicesData?.indices ?? [];
  const quotes = quotesData?.quotes ?? [];
  const usingReal = indicesData?.usingRealData || quotesData?.usingRealData;
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border safe-top">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <h1 className="text-lg font-bold tracking-tight">MX Cartera Global</h1>
          {usingReal && <span className="text-[10px] font-medium bg-success/15 text-success px-2 py-0.5 rounded-full">EN VIVO</span>}
        </div>
      </header>
      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-6">
        <AssetSearch placeholder="Buscar acción, ETF o FIBRA" />
        <section>
          <p className="text-muted text-sm">Mercados</p>
          <h2 className="text-xl font-semibold">{usingReal ? "Datos en vivo" : "Datos de ejemplo"}</h2>
        </section>
        <section>
          <h3 className="font-semibold text-sm text-muted uppercase tracking-wide mb-3">Índices</h3>
          {indicesLoading && indices.length === 0 ? <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map((i) => <div key={i} className="bg-card rounded-xl h-24 animate-pulse border border-border" />)}</div> : (
            <div className="grid grid-cols-2 gap-3">
              {indices.map((idx) => (
                <div key={idx.symbol} className="bg-card rounded-xl p-3 border border-border">
                  <p className="font-semibold text-sm truncate">{idx.name}</p>
                  <p className="text-lg font-bold">{formatPrice(idx.price)}</p>
                  <p className={idx.changePercent >= 0 ? "text-success text-sm" : "text-danger text-sm"}>{formatPercent(idx.changePercent)}</p>
                </div>
              ))}
            </div>
          )}
        </section>
        <section>
          <h3 className="font-semibold text-sm text-muted uppercase tracking-wide mb-3">Mi lista</h3>
          {quotesLoading && quotes.length === 0 ? <div className="bg-card rounded-xl h-40 animate-pulse border border-border" /> : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {quotes.map((stock, i) => (
                <Link key={stock.symbol} href={`/asset/${encodeURIComponent(stock.symbol)}`} className={`flex items-center justify-between px-4 py-3 ${i !== quotes.length - 1 ? "border-b border-border" : ""}`}>
                  <div><p className="font-semibold text-sm">{stock.symbol}</p><p className="text-xs text-muted truncate max-w-[140px]">{stock.name}</p></div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatMxn(toMxn(stock.price, stock.currency || (stock.region === "MX" ? "MXN" : "USD"), usdMxn))}</p>
                    <p className={stock.changePercent >= 0 ? "text-success text-xs" : "text-danger text-xs"}>{formatPercent(stock.changePercent)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
        <section className="pb-4">
          <div className="grid grid-cols-4 gap-3">
            {[{ href: "/dividends", icon: "💰", label: "Dividendos" }, { href: "/ipo", icon: "🚀", label: "IPO" }, { href: "/analysis", icon: "🔍", label: "Análisis" }, { href: "/calendar", icon: "📅", label: "Agenda" }].map((item) => (
              <Link key={item.href} href={item.href} className="bg-card rounded-xl p-3 border border-border flex flex-col items-center gap-1.5">
                <span className="text-2xl">{item.icon}</span>
                <span className="text-[11px] font-medium text-center">{item.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
