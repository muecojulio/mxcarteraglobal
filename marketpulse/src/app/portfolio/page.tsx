"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuotes } from "@/lib/market-data/client";
import { loadPositions, savePositions, loadWatchlist, loadPrefs, savePrefs, type Position as PersistPosition } from "@/lib/persist";
import { LiveBadge } from "@/components/LiveBadge";
import type { Quote } from "@/lib/market-data/types";
import { useUsdMxn, toDisplay } from "@/lib/fx";
import { PortfolioEvents } from "@/components/PortfolioEvents";
import { RebalanceSuggestions } from "@/components/RebalanceSuggestions";
import { TaxEstimator } from "@/components/TaxEstimator";
import { PortfolioBackup } from "@/components/PortfolioBackup";
import { useToast } from "@/components/Toast";

type Position = {
  id: string; symbol: string; name: string; quantity: number; avgCost: number; region: "MX" | "US"; market?: string; currency: "MXN" | "USD";
};
function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: currency === "MXN" ? "MXN" : "USD", minimumFractionDigits: 2 }).format(value);
}
function fromPersist(p: PersistPosition, i: number): Position {
  const symbol = String(p.symbol || "");
  const quantity = Number(p.shares ?? p.quantity ?? 0);
  const avgCost = Number(p.avgCost ?? p.avgPrice ?? 0);
  const region = (p.region === "MX" || symbol.endsWith(".MX") ? "MX" : "US") as "MX" | "US";
  return { id: String(p.id || `${symbol}-${i}`), symbol, name: String(p.name || symbol), quantity, avgCost, region, currency: region === "MX" ? "MXN" : "USD" };
}
function toPersist(list: Position[]): PersistPosition[] {
  return list.map((p) => ({ symbol: p.symbol, shares: p.quantity, avgCost: p.avgCost, id: p.id, name: p.name, region: p.region, currency: p.currency }));
}

export default function PortfolioPage() {
  const toast = useToast();
  const [positions, setPositions] = useState<Position[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "MX" | "US">("ALL");
  const [displayCurrency, setDisplayCurrency] = useState<"USD" | "MXN">("MXN");
  const { fx } = useUsdMxn();
  const [form, setForm] = useState({ symbol: "", quantity: "", avgCost: "" });
  useEffect(() => {
    setPositions(loadPositions().map(fromPersist));
    const prefs = loadPrefs();
    if (prefs.displayCurrency) setDisplayCurrency(prefs.displayCurrency);
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) savePositions(toPersist(positions)); }, [positions, hydrated]);
  useEffect(() => { if (hydrated) savePrefs({ displayCurrency }); }, [displayCurrency, hydrated]);
  const shown = useMemo(() => positions.filter((p) => filter === "ALL" || p.region === filter), [positions, filter]);
  const { data, loading } = useQuotes(shown.map((p) => p.symbol), 45_000);
  const quotesMap = useMemo(() => { const map = new Map<string, Quote>(); (data?.quotes ?? []).forEach((q) => map.set(q.symbol.toUpperCase(), q)); return map; }, [data]);
  const rate = fx?.usdMxn ?? 17.5;
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <h1 className="text-lg font-bold">Cartera</h1>
          <LiveBadge on={!!data?.usingRealData} />
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        <div className="flex gap-2">{(["ALL", "MX", "US"] as const).map((f) => <button key={f} type="button" className={filter === f ? "ui-chip ui-chip-active" : "ui-chip"} onClick={() => setFilter(f)}>{f}</button>)}</div>
        <div className="flex gap-2">{(["MXN", "USD"] as const).map((c) => <button key={c} type="button" className={displayCurrency === c ? "ui-chip ui-chip-active" : "ui-chip"} onClick={() => setDisplayCurrency(c)}>{c}</button>)}</div>
        <form className="bg-card border border-border rounded-xl p-3 space-y-2" onSubmit={(e) => {
          e.preventDefault();
          const symbol = form.symbol.trim().toUpperCase();
          const quantity = Number(form.quantity); const avgCost = Number(form.avgCost);
          if (!symbol || !Number.isFinite(quantity) || !Number.isFinite(avgCost)) return;
          const region = symbol.endsWith(".MX") ? "MX" : "US";
          setPositions((prev) => [...prev, { id: crypto.randomUUID(), symbol, name: symbol, quantity, avgCost, region, currency: region === "MX" ? "MXN" : "USD" }]);
          setForm({ symbol: "", quantity: "", avgCost: "" }); toast.push("Posición agregada");
        }}>
          <input className="ui-input" placeholder="Ticker" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
          <input className="ui-input" placeholder="Títulos" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <input className="ui-input" placeholder="Precio promedio" value={form.avgCost} onChange={(e) => setForm({ ...form, avgCost: e.target.value })} />
          <button type="submit" className="ui-btn ui-btn-primary w-full">Agregar</button>
        </form>
        {loading && !data?.quotes.length ? <p className="text-sm text-muted">Cargando…</p> : shown.map((p) => {
          const live = quotesMap.get(p.symbol.toUpperCase());
          const currentPrice = live?.price ?? p.avgCost;
          const marketValue = toDisplay(p.quantity * currentPrice, p.currency, displayCurrency, rate);
          const costBasis = toDisplay(p.quantity * p.avgCost, p.currency, displayCurrency, rate);
          const pl = marketValue - costBasis;
          return (
            <div key={p.id} className="bg-card border border-border rounded-xl p-3 flex justify-between gap-2">
              <Link href={`/asset/${encodeURIComponent(p.symbol)}`} className="min-w-0">
                <p className="font-semibold text-sm">{p.symbol}</p>
                <p className="text-xs text-muted">{p.quantity} títulos · {formatMoney(marketValue, displayCurrency)} · {pl >= 0 ? "+" : ""}{formatMoney(pl, displayCurrency)}</p>
              </Link>
              <button type="button" className="text-xs text-danger" onClick={() => setPositions((prev) => prev.filter((x) => x.id !== p.id))}>Quitar</button>
            </div>
          );
        })}
        <PortfolioEvents symbols={[...new Set([...positions.map((p) => p.symbol), ...loadWatchlist()])]} />
        <RebalanceSuggestions />
        <TaxEstimator />
        <PortfolioBackup />
        <Link href="/portfolio/analysis" className="ui-btn ui-btn-primary w-full">Análisis de cartera</Link>
      </main>
    </div>
  );
}
