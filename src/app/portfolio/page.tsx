"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuotes } from "@/lib/market-data/client";
import { loadPositions, savePositions, loadWatchlist, loadPrefs, savePrefs } from "@/lib/persist";
import { LiveBadge } from "@/components/LiveBadge";
import type { Quote } from "@/lib/market-data/types";
import { useUsdMxn, toDisplay } from "@/lib/fx";
import { PortfolioEvents } from "@/components/PortfolioEvents";
import { RebalanceSuggestions } from "@/components/RebalanceSuggestions";
import { TaxEstimator } from "@/components/TaxEstimator";
import { PortfolioBackup } from "@/components/PortfolioBackup";
import { useToast } from "@/components/Toast";
import { PortfolioPeriodChart } from "@/components/portfolio/PortfolioPeriodChart";

type Position = { id: string; symbol: string; name: string; quantity: number; avgCost: number; region: "MX" | "US"; market: string; currency: "MXN" | "USD"; shares?: number };
function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: currency === "MXN" ? "MXN" : "USD" }).format(value);
}
function formatPercent(value: number) { return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`; }

export default function PortfolioPage() {
  const toast = useToast();
  const [positions, setPositions] = useState<Position[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "MX" | "US">("ALL");
  const [displayCurrency, setDisplayCurrency] = useState<"USD" | "MXN">("MXN");
  const { fx } = useUsdMxn();
  const [form, setForm] = useState({ symbol: "", name: "", quantity: "", avgCost: "", region: "US" as "MX" | "US" });
  useEffect(() => {
    const raw = loadPositions() as Array<Position & { shares?: number }>;
    setPositions(raw.map((p) => ({ ...p, id: p.id || p.symbol, name: p.name || p.symbol, quantity: Number(p.quantity ?? p.shares ?? 0), avgCost: Number(p.avgCost ?? 0), region: p.region || (String(p.symbol).endsWith(".MX") ? "MX" : "US"), market: p.market || "", currency: p.currency || (String(p.symbol).endsWith(".MX") ? "MXN" : "USD") })));
    const prefs = loadPrefs();
    if (prefs.displayCurrency) setDisplayCurrency(prefs.displayCurrency);
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) savePositions(positions as never); }, [positions, hydrated]);
  useEffect(() => { if (hydrated) savePrefs({ displayCurrency }); }, [displayCurrency, hydrated]);
  const symbols = useMemo(() => positions.map((p) => p.symbol), [positions]);
  const eventSymbols = useMemo(() => Array.from(new Set([...positions.map((p) => p.symbol.toUpperCase()), ...loadWatchlist().map((s) => s.toUpperCase())])), [positions]);
  const { data, loading, error, refresh } = useQuotes(symbols, 45_000);
  const quotesMap = useMemo(() => { const map = new Map<string, Quote>(); (data?.quotes ?? []).forEach((q) => map.set(q.symbol.toUpperCase(), q)); return map; }, [data]);
  const usdMxn = fx?.usdMxn ?? 17;
  const calculated = positions.map((p) => {
    const live = quotesMap.get(p.symbol.toUpperCase());
    const currentPrice = live?.price ?? p.avgCost;
    const marketValue = p.quantity * currentPrice;
    const costBasis = p.quantity * p.avgCost;
    const pl = marketValue - costBasis;
    return { ...p, name: live?.name || p.name, currentPrice, marketValue, costBasis, pl, plPercent: costBasis > 0 ? (pl / costBasis) * 100 : 0 };
  });
  const filtered = calculated.filter((p) => filter === "ALL" || p.region === filter);
  let totalValue = 0, totalCost = 0, totalPL = 0;
  calculated.forEach((p) => {
    const cur = p.currency === "MXN" ? "MXN" : "USD";
    totalValue += toDisplay(p.marketValue, cur, displayCurrency, usdMxn);
    totalCost += toDisplay(p.costBasis, cur, displayCurrency, usdMxn);
    totalPL += toDisplay(p.pl, cur, displayCurrency, usdMxn);
  });
  return (
    <div className="flex flex-col min-h-full">
      <header className="app-header safe-top">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <h1 className="text-lg font-bold">Cartera</h1>
          <LiveBadge live={!!data?.usingRealData} />
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3 stagger">
        <p className="text-2xl font-bold">{formatMoney(totalValue, displayCurrency)}</p>
        <p className={totalPL >= 0 ? "text-success text-sm" : "text-danger text-sm"}>{formatMoney(totalPL, displayCurrency)} ({formatPercent(totalCost ? (totalPL / totalCost) * 100 : 0)})</p>
        <PortfolioPeriodChart holdings={positions.map((p) => ({ symbol: p.symbol, quantity: p.quantity }))} displayCurrency={displayCurrency} />
        <div className="flex gap-2">{(["ALL", "MX", "US"] as const).map((f) => <button key={f} type="button" className={filter === f ? "ui-chip ui-chip-active" : "ui-chip"} onClick={() => setFilter(f)}>{f}</button>)}</div>
        <div className="flex gap-2">
          <button type="button" className="ui-chip" onClick={() => setDisplayCurrency(displayCurrency === "MXN" ? "USD" : "MXN")}>{displayCurrency}</button>
          <button type="button" className="ui-chip" onClick={() => void refresh()}>{loading ? "…" : "Actualizar"}</button>
          <Link href="/portfolio/analysis" className="ui-chip">Análisis</Link>
        </div>
        {error ? <p className="text-danger text-xs">{error}</p> : null}
        {filtered.map((p) => (
          <div key={p.id} className="bg-card border border-border rounded-xl p-3">
            <div className="flex justify-between"><Link href={`/asset/${encodeURIComponent(p.symbol)}`} className="font-semibold">{p.symbol}</Link><span>{formatMoney(toDisplay(p.marketValue, p.currency, displayCurrency, usdMxn), displayCurrency)}</span></div>
            <p className="text-xs text-muted">{p.quantity} × {p.currentPrice.toFixed(2)} · P/L {formatPercent(p.plPercent)}</p>
            <button type="button" className="text-danger text-xs" onClick={() => { setPositions((xs) => xs.filter((x) => x.id !== p.id)); toast.push("Posición eliminada"); }}>Quitar</button>
          </div>
        ))}
        <button type="button" className="ui-btn ui-btn-primary w-full" onClick={() => setShowAdd((v) => !v)}>{showAdd ? "Cerrar" : "Agregar"}</button>
        {showAdd ? (
          <form className="elastic-open space-y-2" onSubmit={(e) => {
            e.preventDefault();
            const symbol = form.symbol.trim().toUpperCase();
            const quantity = Number(form.quantity); const avgCost = Number(form.avgCost);
            if (!symbol || !(quantity > 0) || !(avgCost >= 0)) return;
            setPositions((xs) => [...xs, { id: `${symbol}-${Date.now()}`, symbol, name: form.name || symbol, quantity, avgCost, region: form.region, market: form.region === "MX" ? "BMV" : "US", currency: form.region === "MX" ? "MXN" : "USD" }]);
            setForm({ symbol: "", name: "", quantity: "", avgCost: "", region: "US" }); setShowAdd(false); toast.push("Posición guardada");
          }}>
            <input className="ui-input" placeholder="Ticker" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
            <input className="ui-input" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="ui-input" placeholder="Títulos" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            <input className="ui-input" placeholder="Costo promedio" value={form.avgCost} onChange={(e) => setForm({ ...form, avgCost: e.target.value })} />
            <div className="flex gap-2"><button type="button" className={form.region === "US" ? "ui-chip ui-chip-active" : "ui-chip"} onClick={() => setForm({ ...form, region: "US" })}>US</button><button type="button" className={form.region === "MX" ? "ui-chip ui-chip-active" : "ui-chip"} onClick={() => setForm({ ...form, region: "MX" })}>MX</button></div>
            <button type="submit" className="ui-btn ui-btn-primary w-full">Guardar</button>
          </form>
        ) : null}
        <PortfolioEvents symbols={eventSymbols} /><RebalanceSuggestions /><TaxEstimator /><PortfolioBackup />
      </main>
    </div>
  );
}
