"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PortfolioEvents } from "@/components/PortfolioEvents";
import { TaxEstimator } from "@/components/TaxEstimator";
import { useQuotes } from "@/lib/market-data/client";
import { estimateDividendTax, detectTaxAssetKind } from "@/lib/tax-mx";
import { MonthGrid } from "@/components/asset/MonthGrid";
import { CollapsiblePanel } from "@/components/ui/CollapsiblePanel";

type Position = { symbol: string; name?: string; quantity?: number; shares?: number; avgCost?: number };
type DivPayment = { date: string; amount: number };
const POS_KEY = "marketpulse_positions";
const DIV_GOAL_KEY = "marketpulse_div_goal";
const DIV_PROJ_KEY = "marketpulse_div_proj";
function loadPositions(): Position[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(POS_KEY) || "[]"); } catch { return []; }
}
function formatMoney(value: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);
}
async function fetchDividendPayments(symbol: string): Promise<DivPayment[]> {
  try {
    const res = await fetch(`/api/dividends?symbol=${encodeURIComponent(symbol)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.dividends || []).map((d: { date: string; amount: number }) => ({ date: String(d.date), amount: Number(d.amount || 0) }));
  } catch { return []; }
}
function annualFromPayments(list: DivPayment[]): number {
  if (!list.length) return 0;
  if (list.length >= 4) return list.slice(0, 4).reduce((s, d) => s + d.amount, 0);
  const sum = list.reduce((s, d) => s + d.amount, 0);
  return (sum / list.length) * 4;
}
export default function DividendAnalysisPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [annualMap, setAnnualMap] = useState<Record<string, number>>({});
  const [payMap, setPayMap] = useState<Record<string, DivPayment[]>>({});
  const [loadingDivs, setLoadingDivs] = useState(false);
  const [goal, setGoal] = useState(60_000);
  const [years, setYears] = useState(10);
  const [divGrowth, setDivGrowth] = useState(0.04);
  const [stockGrowth, setStockGrowth] = useState(0.055);
  const [contribution, setContribution] = useState(9_000);
  const [showProj, setShowProj] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPositions(loadPositions());
      try {
        const g = localStorage.getItem(DIV_GOAL_KEY);
        if (g) setGoal(Number(g) || 60_000);
        const p = localStorage.getItem(DIV_PROJ_KEY);
        if (p) {
          const j = JSON.parse(p);
          if (j.divGrowth != null) setDivGrowth(Number(j.divGrowth));
          if (j.stockGrowth != null) setStockGrowth(Number(j.stockGrowth));
          if (j.contribution != null) setContribution(Number(j.contribution));
          if (j.years != null) setYears(Number(j.years));
        }
      } catch { /* */ }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const symbols = useMemo(() => [...new Set(positions.map((p) => p.symbol))], [positions]);
  const { data: quotesData } = useQuotes(symbols, 60_000);
  const loadDivs = useCallback(async () => {
    if (!symbols.length) return;
    setLoadingDivs(true);
    const next: Record<string, number> = {};
    const pays: Record<string, DivPayment[]> = {};
    await Promise.all(symbols.map(async (s) => {
      const list = await fetchDividendPayments(s);
      pays[s.toUpperCase()] = list;
      next[s.toUpperCase()] = annualFromPayments(list);
    }));
    setAnnualMap(next); setPayMap(pays); setLoadingDivs(false);
  }, [symbols]);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => { void loadDivs(); });
    return () => window.cancelAnimationFrame(frame);
  }, [loadDivs]);
  const rows = positions.map((p) => {
    const qty = Number(p.quantity ?? p.shares ?? 0);
    const live = quotesData?.quotes.find((q) => q.symbol.toUpperCase() === p.symbol.toUpperCase());
    const perShare = annualMap[p.symbol.toUpperCase()] || (live ? live.price * 0.03 : 0);
    const annualIncome = perShare * qty;
    const tax = estimateDividendTax({ grossDividend: annualIncome, assetKind: detectTaxAssetKind(p.symbol), scenario: "w8ben" });
    return { symbol: p.symbol, qty, annualIncome, net: tax.netApprox };
  });
  const total = rows.reduce((s, r) => s + r.annualIncome, 0);
  const months = new Array<number>(12).fill(0);
  Object.values(payMap).forEach((list) => {
    list.forEach((d) => {
      const m = Number(String(d.date).slice(5, 7));
      if (m >= 1 && m <= 12) months[m - 1] += d.amount;
    });
  });
  const chartMonths = months.every((n) => n === 0) && total > 0
    ? Array.from({ length: 12 }, () => total / 12)
    : months;
  let projected = total;
  for (let i = 1; i <= years; i++) projected = projected * (1 + divGrowth) + contribution * (1 + stockGrowth);
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
          <Link href="/dividends" className="ui-text-action text-primary text-sm">← Divs</Link>
          <h1 className="text-lg font-bold">Ingreso por dividendos</h1>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        <p className="text-sm">Anual est. {formatMoney(total)} · meta {formatMoney(goal)} {loadingDivs ? "· cargando pagos…" : ""}</p>
        {loadingDivs ? <p className="sr-only" role="status" aria-live="polite">Cargando pagos de dividendos.</p> : null}
        <MonthGrid amounts={chartMonths} />
        <label className="block space-y-1 text-xs font-medium" htmlFor="dividend-goal">Meta anual de dividendos (MXN)
          <input id="dividend-goal" className="ui-input" type="number" min="0" inputMode="decimal" value={goal} onChange={(e) => { const n = Number(e.target.value) || 0; setGoal(n); localStorage.setItem(DIV_GOAL_KEY, String(n)); }} />
        </label>
        {rows.map((r) => (
          <Link key={r.symbol} href={`/asset/${encodeURIComponent(r.symbol)}`} className="block bg-card border border-border rounded-xl p-3">
            <p className="font-semibold text-sm">{r.symbol}</p>
            <p className="text-xs text-muted">{r.qty} títulos · bruto {formatMoney(r.annualIncome)} · neto ≈ {formatMoney(r.net)}</p>
          </Link>
        ))}
        <button id="dividend-projection-toggle" type="button" className="ui-btn ui-btn-secondary w-full" aria-expanded={showProj} aria-controls="dividend-projection-panel" onClick={() => setShowProj((v) => !v)}>
          {showProj ? "Ocultar proyección" : "Mostrar proyección"}
        </button>
        <CollapsiblePanel id="dividend-projection-panel" labelledBy="dividend-projection-toggle" open={showProj} className="bg-card border border-border rounded-xl p-3 space-y-2 text-sm">
          <p>A {years} años ≈ {formatMoney(projected)}</p>
          <label className="block text-xs font-medium" htmlFor="dividend-years">Años de proyección
            <input id="dividend-years" type="range" min={1} max={30} value={years} onChange={(e) => { const n = Number(e.target.value); setYears(n); localStorage.setItem(DIV_PROJ_KEY, JSON.stringify({ years: n, divGrowth, stockGrowth, contribution })); }} />
          </label>
          <label className="block text-xs font-medium" htmlFor="dividend-growth">Crecimiento anual de dividendos (%)
            <input id="dividend-growth" type="range" min={0} max={15} value={Math.round(divGrowth * 100)} onChange={(e) => { const n = Number(e.target.value) / 100; setDivGrowth(n); localStorage.setItem(DIV_PROJ_KEY, JSON.stringify({ years, divGrowth: n, stockGrowth, contribution })); }} />
          </label>
          <label className="block space-y-1 text-xs font-medium" htmlFor="dividend-contribution">Aportación anual (MXN)
            <input id="dividend-contribution" className="ui-input" type="number" min="0" inputMode="decimal" value={contribution} onChange={(e) => { const n = Number(e.target.value) || 0; setContribution(n); localStorage.setItem(DIV_PROJ_KEY, JSON.stringify({ years, divGrowth, stockGrowth, contribution: n })); }} />
          </label>
        </CollapsiblePanel>
        <PortfolioEvents symbols={symbols} /><TaxEstimator />
      </main>
    </div>
  );
}
