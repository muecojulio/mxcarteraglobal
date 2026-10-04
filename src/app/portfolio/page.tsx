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
import { ScrollableChips } from "@/components/ui/ScrollableChips";
import { CollapsiblePanel } from "@/components/ui/CollapsiblePanel";

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
  const [formError, setFormError] = useState("");
  const [filter, setFilter] = useState<"ALL" | "MX" | "US">("ALL");
  const [displayCurrency, setDisplayCurrency] = useState<"USD" | "MXN">("MXN");
  const { fx } = useUsdMxn();
  const [form, setForm] = useState({ symbol: "", name: "", quantity: "", avgCost: "", region: "US" as "MX" | "US" });
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const raw = loadPositions() as Array<Position & { shares?: number }>;
      setPositions(raw.map((p) => ({ ...p, id: p.id || p.symbol, name: p.name || p.symbol, quantity: Number(p.quantity ?? p.shares ?? 0), avgCost: Number(p.avgCost ?? 0), region: p.region || (String(p.symbol).endsWith(".MX") ? "MX" : "US"), market: p.market || "", currency: p.currency || (String(p.symbol).endsWith(".MX") ? "MXN" : "USD") })));
      const prefs = loadPrefs();
      if (prefs.displayCurrency) setDisplayCurrency(prefs.displayCurrency);
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
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
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <h1 className="text-lg font-bold">Cartera</h1>
          <LiveBadge live={!!data?.usingRealData} />
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        <p className="text-2xl font-bold">{formatMoney(totalValue, displayCurrency)}</p>
        <p className={totalPL >= 0 ? "text-success text-sm" : "text-danger text-sm"}>{formatMoney(totalPL, displayCurrency)} ({formatPercent(totalCost ? (totalPL / totalCost) * 100 : 0)})</p>
        <PortfolioPeriodChart holdings={positions.map((p) => ({ symbol: p.symbol, quantity: p.quantity }))} displayCurrency={displayCurrency} />
        <ScrollableChips
          label="Filtrar posiciones por mercado"
          options={[
            { value: "ALL" as const, label: "Todas" },
            { value: "MX" as const, label: "México" },
            { value: "US" as const, label: "EE.UU." },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`ui-chip${displayCurrency === "USD" ? " ui-chip-active" : ""}`}
            aria-label={`Moneda de visualización ${displayCurrency}; cambiar a ${displayCurrency === "MXN" ? "USD" : "MXN"}`}
            aria-pressed={displayCurrency === "USD"}
            onClick={() => setDisplayCurrency(displayCurrency === "MXN" ? "USD" : "MXN")}
          >
            {displayCurrency}
          </button>
          <button type="button" className="ui-btn ui-btn-secondary" disabled={loading} aria-busy={loading} onClick={() => void refresh()}>
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
          <Link href="/portfolio/analysis" className="ui-chip">Análisis</Link>
        </div>
        {error ? <p className="text-danger text-xs" role="alert">{error}</p> : null}
        {filtered.map((p) => (
          <div key={p.id} className="bg-card border border-border rounded-xl p-3">
            <div className="flex justify-between"><Link href={`/asset/${encodeURIComponent(p.symbol)}`} className="ui-text-action font-semibold">{p.symbol}</Link><span>{formatMoney(toDisplay(p.marketValue, p.currency, displayCurrency, usdMxn), displayCurrency)}</span></div>
            <p className="text-xs text-muted">{p.quantity} × {p.currentPrice.toFixed(2)} · P/L {formatPercent(p.plPercent)}</p>
            <button type="button" className="ui-text-action text-danger text-xs" onClick={() => { setPositions((xs) => xs.filter((x) => x.id !== p.id)); toast.push("Posición eliminada"); }}>Quitar</button>
          </div>
        ))}
        <button
          id="add-position-toggle"
          type="button"
          className="ui-btn ui-btn-primary w-full"
          aria-expanded={showAdd}
          aria-controls="add-position-panel"
          onClick={() => { setFormError(""); setShowAdd((v) => !v); }}
        >
          {showAdd ? "Cerrar" : "Agregar posición"}
        </button>
        <CollapsiblePanel id="add-position-panel" labelledBy="add-position-toggle" open={showAdd}>
          <form className="space-y-2" onSubmit={(e) => {
            e.preventDefault();
            const symbol = form.symbol.trim().toUpperCase();
            const quantity = Number(form.quantity); const avgCost = Number(form.avgCost);
            if (!symbol || !(quantity > 0) || !(avgCost >= 0)) {
              setFormError("Escribe un ticker, una cantidad mayor que cero y un costo válido.");
              return;
            }
            setPositions((xs) => [...xs, { id: `${symbol}-${Date.now()}`, symbol, name: form.name || symbol, quantity, avgCost, region: form.region, market: form.region === "MX" ? "BMV" : "US", currency: form.region === "MX" ? "MXN" : "USD" }]);
            setForm({ symbol: "", name: "", quantity: "", avgCost: "", region: "US" });
            setFormError("");
            setShowAdd(false);
            toast.push("Posición guardada");
          }}>
            <label className="block space-y-1 text-xs font-medium" htmlFor="position-symbol">Ticker
              <input id="position-symbol" className="ui-input" autoCapitalize="characters" value={form.symbol} onChange={(e) => { setFormError(""); setForm({ ...form, symbol: e.target.value }); }} required />
            </label>
            <label className="block space-y-1 text-xs font-medium" htmlFor="position-name">Nombre (opcional)
              <input id="position-name" className="ui-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="block space-y-1 text-xs font-medium" htmlFor="position-quantity">Títulos
              <input id="position-quantity" className="ui-input" type="number" min="0.000001" step="any" inputMode="decimal" value={form.quantity} onChange={(e) => { setFormError(""); setForm({ ...form, quantity: e.target.value }); }} required />
            </label>
            <label className="block space-y-1 text-xs font-medium" htmlFor="position-cost">Costo promedio
              <input id="position-cost" className="ui-input" type="number" min="0" step="any" inputMode="decimal" value={form.avgCost} onChange={(e) => { setFormError(""); setForm({ ...form, avgCost: e.target.value }); }} required />
            </label>
            <ScrollableChips
              label="Mercado de la posición"
              options={[{ value: "US" as const, label: "EE.UU." }, { value: "MX" as const, label: "México" }]}
              value={form.region}
              onChange={(region) => setForm({ ...form, region })}
            />
            {formError ? <p className="text-sm text-danger" role="alert">{formError}</p> : null}
            <button type="submit" className="ui-btn ui-btn-primary w-full">Guardar posición</button>
          </form>
        </CollapsiblePanel>
        <PortfolioEvents symbols={eventSymbols} /><RebalanceSuggestions /><TaxEstimator /><PortfolioBackup />
      </main>
    </div>
  );
}
