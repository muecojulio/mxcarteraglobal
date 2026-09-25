"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuotes, useDividends } from "@/lib/market-data/client";
import { useUsdMxn, toMxn, formatMxn } from "@/lib/fx";
const FEATURED = [
  { symbol: "AAPL", name: "Apple Inc.", region: "US" as const },
  { symbol: "MSFT", name: "Microsoft", region: "US" as const },
  { symbol: "JNJ", name: "Johnson & Johnson", region: "US" as const },
  { symbol: "KO", name: "Coca-Cola", region: "US" as const },
  { symbol: "SCHD", name: "Schwab US Dividend ETF", region: "US" as const },
  { symbol: "AMXL.MX", name: "América Móvil", region: "MX" as const },
  { symbol: "WALMEX.MX", name: "Walmart México", region: "MX" as const },
  { symbol: "GFNORTEO.MX", name: "Banorte", region: "MX" as const },
];
export default function DividendsPage() {
  const [filter, setFilter] = useState<"ALL" | "MX" | "US">("ALL");
  const [selected, setSelected] = useState<string | null>("AAPL");
  const { fx } = useUsdMxn(120_000);
  const list = useMemo(() => FEATURED.filter((f) => filter === "ALL" || f.region === filter), [filter]);
  const { data: quotesData } = useQuotes(list.map((f) => f.symbol), 60_000);
  const { data: divData, loading } = useDividends(selected);
  const quotes = quotesData?.quotes ?? [];
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <h1 className="text-lg font-bold">Dividendos</h1>
          <Link href="/dividends/analysis" className="text-primary text-sm">Análisis</Link>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        <div className="flex gap-2">{(["ALL", "MX", "US"] as const).map((f) => (
          <button key={f} type="button" className={filter === f ? "ui-chip ui-chip-active" : "ui-chip"} onClick={() => setFilter(f)}>{f}</button>
        ))}</div>
        {list.map((f) => {
          const q = quotes.find((x) => x.symbol === f.symbol);
          return (
            <button key={f.symbol} type="button" onClick={() => setSelected(f.symbol)} className="w-full text-left bg-card border border-border rounded-xl p-3">
              <p className="font-semibold text-sm">{f.symbol} <span className="text-muted font-normal">{f.name}</span></p>
              {q ? <p className="text-xs text-muted">{formatMxn(toMxn(q.price, q.currency, fx?.usdMxn ?? null))}</p> : null}
            </button>
          );
        })}
        <section className="bg-card border border-border rounded-xl p-3">
          <p className="text-sm font-medium">Historial {selected}</p>
          {loading ? <p className="text-xs text-muted">Cargando…</p> : (divData?.dividends || []).slice(0, 8).map((d, i) => (
            <p key={i} className="text-xs text-muted">{d.date} · {d.amount} {d.currency}</p>
          ))}
          {!loading && !divData?.dividends?.length ? <p className="text-xs text-muted">Sin historial en la API free.</p> : null}
        </section>
        <p className="text-[11px] text-muted">Estimaciones educativas. No es asesoría fiscal.</p>
      </main>
    </div>
  );
}
