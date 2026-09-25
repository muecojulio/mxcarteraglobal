"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PortfolioEvents } from "@/components/PortfolioEvents";
import { TaxEstimator } from "@/components/TaxEstimator";
import { useQuotes } from "@/lib/market-data/client";

type Position = { id: string; symbol: string; name: string; quantity: number; avgCost: number; region: "MX" | "US"; currency: "MXN" | "USD" };
type DivPayment = { date: string; amount: number };
const POS_KEY = "marketpulse_positions";
const DIV_GOAL_KEY = "marketpulse_div_goal";
const DIV_PROJ_KEY = "marketpulse_div_proj";

function loadPositions(): Position[] {
  if (typeof window === "undefined") return [];
  try { const raw = localStorage.getItem(POS_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function formatMoney(value: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: currency === "USD" ? "USD" : "MXN", maximumFractionDigits: 2 }).format(value);
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
  return (list.reduce((s, d) => s + d.amount, 0) / list.length) * 4;
}

export default function DividendAnalysisPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [annualMap, setAnnualMap] = useState<Record<string, number>>({});
  const [goal, setGoal] = useState(60_000);
  const [divGrowth, setDivGrowth] = useState(0.04);
  const [stockGrowth, setStockGrowth] = useState(0.055);
  const [contribution, setContribution] = useState(9_000);
  useEffect(() => {
    setPositions(loadPositions());
    try {
      const g = localStorage.getItem(DIV_GOAL_KEY); if (g) setGoal(Number(g) || 60_000);
      const p = localStorage.getItem(DIV_PROJ_KEY);
      if (p) { const j = JSON.parse(p); if (j.divGrowth != null) setDivGrowth(Number(j.divGrowth)); if (j.stockGrowth != null) setStockGrowth(Number(j.stockGrowth)); if (j.contribution != null) setContribution(Number(j.contribution)); }
    } catch { /* */ }
  }, []);
  const symbols = useMemo(() => [...new Set(positions.map((p) => p.symbol))], [positions]);
  const { data: quotesData } = useQuotes(symbols, 60_000);
  const priceMap = useMemo(() => { const m = new Map<string, number>(); (quotesData?.quotes ?? []).forEach((q) => m.set(q.symbol.toUpperCase(), q.price)); return m; }, [quotesData]);
  const loadDivs = useCallback(async () => {
    const next: Record<string, number> = {};
    await Promise.all(symbols.map(async (s) => { next[s] = annualFromPayments(await fetchDividendPayments(s)); }));
    setAnnualMap(next);
  }, [symbols]);
  useEffect(() => { void loadDivs(); }, [loadDivs]);
  const rows = positions.map((p) => {
    const price = priceMap.get(p.symbol.toUpperCase()) ?? p.avgCost;
    const annualPerShare = annualMap[p.symbol] ?? 0;
    const annualIncome = annualPerShare * p.quantity;
    const cost = p.avgCost * p.quantity;
    return { ...p, price, annualPerShare, annualIncome, yieldOnCost: cost ? (annualIncome / cost) * 100 : 0, currentYield: price ? (annualPerShare / price) * 100 : 0 };
  });
  const totalIncome = rows.reduce((s, r) => s + r.annualIncome, 0);
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
          <Link href="/dividends" className="text-primary text-sm">← Dividendos</Link>
          <h1 className="text-lg font-bold">Análisis</h1>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        <p className="text-sm">Ingreso anual estimado {formatMoney(totalIncome)}</p>
        <p className="text-xs text-muted">Meta {formatMoney(goal)} · crecimiento div {Math.round(divGrowth * 100)}% · aportación {formatMoney(contribution)}</p>
        {rows.map((r) => (
          <Link key={r.id} href={`/asset/${encodeURIComponent(r.symbol)}`} className="block bg-card border border-border rounded-xl p-3">
            <p className="font-semibold text-sm">{r.symbol}</p>
            <p className="text-xs text-muted">{formatMoney(r.annualIncome, r.currency)} · YOC {r.yieldOnCost.toFixed(1)}% · yield {r.currentYield.toFixed(1)}%</p>
          </Link>
        ))}
        <PortfolioEvents symbols={symbols} />
        <TaxEstimator />
        <p className="text-[11px] text-muted">Estimaciones educativas. No es asesoría ni orden de inversión. Crecimiento de precio usado en proyección: {Math.round(stockGrowth * 100)}%.</p>
      </main>
    </div>
  );
}
