"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PortfolioEvents } from "@/components/PortfolioEvents";
import { TaxEstimator } from "@/components/TaxEstimator";
import { useQuotes } from "@/lib/market-data/client";
import { estimateDividendTax, detectTaxAssetKind } from "@/lib/tax-mx";
import { MonthGrid } from "@/components/asset/MonthGrid";

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
  useEffect(() => { void loadDivs(); }, [loadDivs]);
  const rows = positions.map((p) => {
    const qty = Number(p.quantity ?? p.shares ?? 0);
    const live = quotesData?.quotes.find((q) => q.symbol.toUpperCase() === p.symbol.toUpperCase());
    const perShare = annualMap[p.symbol.toUpperCase()] || (live ? live.price * 0.03 : 0);
    const annualIncome = perShare * qty;
    const tax = estimateDividendTax({ grossDividend: annualIncome, assetKind: detectTaxAssetKind(p.symbol), scenario: "w8ben" });
    return { symbol: p.symbol, qty, annualIncome, net: tax.netApprox };
  });
  const total = rows.reduce((s, r) => s + r.annualIncome, 0);
  const months = Array.from({ length: 12 }, () => 0);
  Object.values(payMap).forEach((list) => {
    list.forEach((d) => {
      const m = Number(String(d.date).slice(5, 7));
      if (m >= 1 && m <= 12) months[m - 1] += d.amount;
    });
  });
  if (months.every((n) => n === 0) && total > 0) months.fill(total / 12);
  let projected = total;
  for (let i = 1; i <= years; i++) projected = projected * (1 + divGrowth) + contribution * (1 + stockGrowth);
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
          <Link href="/dividends" className="text-primary text-sm">← Divs</Link>
          <h1 className="text-lg font-bold">Ingreso por dividendos</h1>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        <p className="text-sm">Anual est. {formatMoney(total)} · meta {formatMoney(goal)} {loadingDivs ? "· cargando pagos…" : ""}</p>
        <MonthGrid amounts={months} />
        <input className="ui-input" type="number" value={goal} onChange={(e) => { const n = Number(e.target.value) || 0; setGoal(n); localStorage.setItem(DIV_GOAL_KEY, String(n)); }} />
        {rows.map((r) => (
          <Link key={r.symbol} href={`/asset/${encodeURIComponent(r.symbol)}`} className="block bg-card border border-border rounded-xl p-3">
            <p className="font-semibold text-sm">{r.symbol}</p>
            <p className="text-xs text-muted">{r.qty} títulos · bruto {formatMoney(r.annualIncome)} · neto ≈ {formatMoney(r.net)}</p>
          </Link>
        ))}
        <button type="button" className="ui-btn w-full" onClick={() => setShowProj((v) => !v)}>{showProj ? "Ocultar proyección" : "Proyección"}</button>
        {showProj ? (
          <div className="bg-card border border-border rounded-xl p-3 space-y-2 text-sm">
            <p>A {years} años ≈ {formatMoney(projected)}</p>
            <input type="range" min={1} max={30} value={years} onChange={(e) => { const n = Number(e.target.value); setYears(n); localStorage.setItem(DIV_PROJ_KEY, JSON.stringify({ years: n, divGrowth, stockGrowth, contribution })); }} />
            <input type="range" min={0} max={15} value={Math.round(divGrowth * 100)} onChange={(e) => { const n = Number(e.target.value) / 100; setDivGrowth(n); localStorage.setItem(DIV_PROJ_KEY, JSON.stringify({ years, divGrowth: n, stockGrowth, contribution })); }} />
            <input className="ui-input" type="number" value={contribution} onChange={(e) => { const n = Number(e.target.value) || 0; setContribution(n); localStorage.setItem(DIV_PROJ_KEY, JSON.stringify({ years, divGrowth, stockGrowth, contribution: n })); }} />
          </div>
        ) : null}
        <PortfolioEvents symbols={symbols} /><TaxEstimator />
      </main>
    </div>
  );
}
