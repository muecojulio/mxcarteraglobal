"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuotes } from "@/lib/market-data/client";
import { useUsdMxn, toDisplay } from "@/lib/fx";
import { RebalanceSuggestions } from "@/components/RebalanceSuggestions";

type Position = { id?: string; symbol: string; name?: string; quantity?: number; shares?: number; avgCost?: number; avgPrice?: number; region?: "MX" | "US"; currency?: "MXN" | "USD" };
const POS_KEY = "marketpulse_positions";
const GOAL_KEY = "marketpulse_goal";
const PROJ_KEY = "marketpulse_projection";
function loadPositions(): Position[] {
  if (typeof window === "undefined") return [];
  try { const raw = localStorage.getItem(POS_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: currency === "USD" ? "USD" : "MXN" }).format(value);
}
export default function PortfolioAnalysisPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [goal, setGoal] = useState(1_000_000);
  const { fx } = useUsdMxn();
  useEffect(() => {
    setPositions(loadPositions());
    try { const g = localStorage.getItem(GOAL_KEY); if (g) setGoal(Number(g) || 1_000_000); JSON.parse(localStorage.getItem(PROJ_KEY) || "{}"); } catch { /* */ }
  }, []);
  const symbols = useMemo(() => positions.map((p) => p.symbol), [positions]);
  const { data } = useQuotes(symbols, 60_000);
  const rate = fx?.usdMxn ?? 17.5;
  const rows = positions.map((p) => {
    const qty = Number(p.quantity ?? p.shares ?? 0);
    const cost = Number(p.avgCost ?? p.avgPrice ?? 0);
    const live = data?.quotes.find((q) => q.symbol.toUpperCase() === String(p.symbol).toUpperCase());
    const price = live?.price ?? cost;
    const currency = (p.currency || (String(p.symbol).endsWith(".MX") ? "MXN" : "USD")) as "MXN" | "USD";
    return { symbol: p.symbol, value: toDisplay(qty * price, currency, "MXN", rate) };
  });
  const total = rows.reduce((s, r) => s + r.value, 0);
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
        {rows.map((r) => <p key={r.symbol} className="text-xs bg-card border border-border rounded-xl p-3">{r.symbol} · {formatMoney(r.value, "MXN")}</p>)}
        <RebalanceSuggestions />
      </main>
    </div>
  );
}
