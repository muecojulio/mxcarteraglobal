"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PortfolioEvents } from "@/components/PortfolioEvents";
import { TaxEstimator } from "@/components/TaxEstimator";
import { detectAssetType } from "@/lib/market-data/types";
import { useQuotes } from "@/lib/market-data/client";
import { estimateDividendTax, detectTaxAssetKind } from "@/lib/tax-mx";

type Position = { id?: string; symbol: string; name?: string; quantity?: number; shares?: number; avgCost?: number; region?: "MX" | "US"; currency?: "MXN" | "USD" };
const POS_KEY = "marketpulse_positions";
const DIV_GOAL_KEY = "marketpulse_div_goal";
function loadPositions(): Position[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(POS_KEY) || "[]"); } catch { return []; }
}
function formatMoney(value: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: currency === "USD" ? "USD" : "MXN" }).format(value);
}
export default function DividendAnalysisPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [goal, setGoal] = useState(12000);
  useEffect(() => {
    setPositions(loadPositions());
    try { const g = localStorage.getItem(DIV_GOAL_KEY); if (g) setGoal(Number(g) || 12000); } catch { /* */ }
  }, []);
  const symbols = useMemo(() => positions.map((p) => p.symbol), [positions]);
  const { data } = useQuotes(symbols, 60_000);
  const rows = positions.map((p) => {
    const qty = Number(p.quantity ?? p.shares ?? 0);
    const live = data?.quotes.find((q) => q.symbol.toUpperCase() === String(p.symbol).toUpperCase());
    const price = live?.price ?? Number(p.avgCost ?? 0);
    const kind = detectTaxAssetKind(p.symbol, detectAssetType(p.symbol) === "fibra" ? "fibra" : undefined);
    const annualPerShare = price * 0.03;
    const annualIncome = annualPerShare * qty;
    const tax = estimateDividendTax({ grossDividend: annualIncome, assetKind: kind === "fibra" ? "fibra" : kind, scenario: "w8ben" });
    return { symbol: p.symbol, qty, price, annualIncome, net: tax.netApprox, kind };
  });
  const total = rows.reduce((s, r) => s + r.annualIncome, 0);
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
          <Link href="/dividends" className="text-primary text-sm">← Divs</Link>
          <h1 className="text-lg font-bold">Ingreso por dividendos</h1>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        <p className="text-sm">Anual est. {formatMoney(total)} · meta {formatMoney(goal)}</p>
        <input className="ui-input" type="number" value={goal} onChange={(e) => { const n = Number(e.target.value) || 0; setGoal(n); localStorage.setItem(DIV_GOAL_KEY, String(n)); }} />
        {rows.map((r) => (
          <Link key={r.symbol} href={`/asset/${encodeURIComponent(r.symbol)}`} className="block bg-card border border-border rounded-xl p-3">
            <p className="font-semibold text-sm">{r.symbol} · {r.kind}</p>
            <p className="text-xs text-muted">{r.qty} títulos · bruto {formatMoney(r.annualIncome)} · neto ≈ {formatMoney(r.net)}</p>
          </Link>
        ))}
        <PortfolioEvents symbols={symbols} /><TaxEstimator />
      </main>
    </div>
  );
}
