"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuotes } from "@/lib/market-data/client";
import { useUsdMxn, toDisplay } from "@/lib/fx";
import { RebalanceSuggestions } from "@/components/RebalanceSuggestions";
type Position = { symbol: string; name?: string; quantity?: number; shares?: number; avgCost?: number; avgPrice?: number; region?: "MX" | "US"; currency?: "MXN" | "USD" };
const POS_KEY = "marketpulse_positions";
const GOAL_KEY = "marketpulse_goal";
const PROJ_KEY = "marketpulse_projection";
const COLORS = ["#f97316","#fb923c","#fbbf24","#a3e635","#34d399","#2dd4bf","#38bdf8","#818cf8","#e879f9","#f472b6"];
function loadPositions(): Position[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(POS_KEY) || "[]"); } catch { return []; }
}
function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: currency === "USD" ? "USD" : "MXN" }).format(value);
}
export default function PortfolioAnalysisPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [goal, setGoal] = useState(1_000_000);
  const [years, setYears] = useState(10);
  const [growth, setGrowth] = useState(0.08);
  const [showProj, setShowProj] = useState(true);
  const { fx } = useUsdMxn();
  useEffect(() => {
    setPositions(loadPositions());
    try {
      const g = localStorage.getItem(GOAL_KEY); if (g) setGoal(Number(g) || 1_000_000);
      const p = JSON.parse(localStorage.getItem(PROJ_KEY) || "{}");
      if (p.years) setYears(Number(p.years));
      if (p.growth) setGrowth(Number(p.growth));
    } catch { /* */ }
  }, []);
  const symbols = useMemo(() => positions.map((p) => p.symbol), [positions]);
  const { data } = useQuotes(symbols, 60_000);
  const rate = fx?.usdMxn ?? 17.5;
  const rows = positions.map((p, i) => {
    const qty = Number(p.quantity ?? p.shares ?? 0);
    const cost = Number(p.avgCost ?? p.avgPrice ?? 0);
    const live = data?.quotes.find((q) => q.symbol.toUpperCase() === String(p.symbol).toUpperCase());
    const price = live?.price ?? cost;
    const currency = (p.currency || (String(p.symbol).endsWith(".MX") ? "MXN" : "USD")) as "MXN" | "USD";
    return { symbol: p.symbol, value: toDisplay(qty * price, currency, "MXN", rate), color: COLORS[i % COLORS.length] };
  });
  const total = rows.reduce((s, r) => s + r.value, 0);
  let projected = total;
  for (let i = 0; i < years; i++) projected *= 1 + growth;
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
          <Link href="/portfolio" className="text-primary text-sm">← Cartera</Link>
          <h1 className="text-lg font-bold">Análisis</h1>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        <p className="text-sm">Valor {formatMoney(total, "MXN")} · meta {formatMoney(goal, "MXN")}</p>
        <input className="ui-input" type="number" value={goal} onChange={(e) => { const n = Number(e.target.value) || 0; setGoal(n); localStorage.setItem(GOAL_KEY, String(n)); }} />
        {rows.map((r) => (
          <p key={r.symbol} className="text-xs bg-card border border-border rounded-xl p-3">
            <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: r.color }} />{r.symbol} · {formatMoney(r.value, "MXN")} {total ? `· ${((r.value / total) * 100).toFixed(1)}%` : ""}
          </p>
        ))}
        <button type="button" className="ui-btn ui-btn-secondary w-full" onClick={() => setShowProj((v) => !v)}>{showProj ? "Ocultar proyección" : "Proyección"}</button>
        {showProj ? (
          <div className="bg-card border border-border rounded-xl p-3 space-y-2 text-sm">
            <p>A {years} años @ {(growth * 100).toFixed(0)}% ≈ {formatMoney(projected, "MXN")}</p>
            <input type="range" min={1} max={30} value={years} onChange={(e) => { const n = Number(e.target.value); setYears(n); localStorage.setItem(PROJ_KEY, JSON.stringify({ years: n, growth })); }} />
            <input type="range" min={0} max={20} value={Math.round(growth * 100)} onChange={(e) => { const n = Number(e.target.value) / 100; setGrowth(n); localStorage.setItem(PROJ_KEY, JSON.stringify({ years, growth: n })); }} />
          </div>
        ) : null}
        <RebalanceSuggestions />
      </main>
    </div>
  );
}
