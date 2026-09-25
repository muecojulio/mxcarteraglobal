"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuotes } from "@/lib/market-data/client";
import { loadPositions, savePositions, type Position } from "@/lib/persist";
import { LiveBadge } from "@/components/LiveBadge";
import { useUsdMxn, toMxn, formatMxn } from "@/lib/fx";
import { PortfolioEvents } from "@/components/PortfolioEvents";
import { RebalanceSuggestions } from "@/components/RebalanceSuggestions";
import { TaxEstimator } from "@/components/TaxEstimator";
import { PortfolioBackup } from "@/components/PortfolioBackup";
import { useToast } from "@/components/Toast";
export default function PortfolioPage() {
  const toast = useToast();
  const [positions, setPositions] = useState<Position[]>([]);
  const [filter, setFilter] = useState<"ALL" | "MX" | "US">("ALL");
  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState("");
  const [avg, setAvg] = useState("");
  useEffect(() => setPositions(loadPositions()), []);
  const shown = useMemo(() => positions.filter((p) => filter === "ALL" || p.region === filter), [positions, filter]);
  const { data, loading } = useQuotes(shown.map((p) => p.symbol), 60_000);
  const { fx } = useUsdMxn();
  const quotes = data?.quotes ?? [];
  const persistAll = (next: Position[]) => { setPositions(next); savePositions(next); };
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <h1 className="text-lg font-bold">Cartera</h1>
          <LiveBadge on={!!data?.usingRealData} />
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        <div className="flex gap-2">{(["ALL", "MX", "US"] as const).map((f) => (
          <button key={f} type="button" className={filter === f ? "ui-chip ui-chip-active" : "ui-chip"} onClick={() => setFilter(f)}>{f}</button>
        ))}</div>
        <form className="bg-card border border-border rounded-xl p-3 space-y-2" onSubmit={(e) => {
          e.preventDefault();
          const s = symbol.trim().toUpperCase();
          const sh = Number(shares); const a = Number(avg);
          if (!s || !Number.isFinite(sh) || !Number.isFinite(a)) return;
          persistAll([...positions, { id: crypto.randomUUID(), symbol: s, name: s, shares: sh, avgPrice: a, currency: s.endsWith(".MX") ? "MXN" : "USD", region: s.endsWith(".MX") ? "MX" : "US" }]);
          setSymbol(""); setShares(""); setAvg(""); toast.push("Posición agregada");
        }}>
          <input className="ui-input" placeholder="Ticker" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
          <input className="ui-input" placeholder="Títulos" value={shares} onChange={(e) => setShares(e.target.value)} />
          <input className="ui-input" placeholder="Precio promedio" value={avg} onChange={(e) => setAvg(e.target.value)} />
          <button type="submit" className="ui-btn ui-btn-primary w-full">Agregar</button>
        </form>
        {loading && !quotes.length ? <p className="text-sm text-muted">Cargando…</p> : shown.map((p) => {
          const q = quotes.find((x) => x.symbol === p.symbol);
          const px = q?.price ?? p.avgPrice;
          const val = toMxn(px * p.shares, p.currency, fx?.usdMxn ?? null);
          return (
            <div key={p.id} className="bg-card border border-border rounded-xl p-3 flex justify-between gap-2">
              <Link href={`/asset/${encodeURIComponent(p.symbol)}`} className="min-w-0">
                <p className="font-semibold text-sm">{p.symbol}</p>
                <p className="text-xs text-muted">{p.shares} títulos · {formatMxn(val)}</p>
              </Link>
              <button type="button" className="text-xs text-danger" onClick={() => persistAll(positions.filter((x) => x.id !== p.id))}>Quitar</button>
            </div>
          );
        })}
        <PortfolioEvents symbols={positions.map((p) => p.symbol)} />
        <RebalanceSuggestions />
        <TaxEstimator />
        <PortfolioBackup />
        <Link href="/portfolio/analysis" className="ui-btn ui-btn-primary w-full">Análisis de cartera</Link>
      </main>
    </div>
  );
}
