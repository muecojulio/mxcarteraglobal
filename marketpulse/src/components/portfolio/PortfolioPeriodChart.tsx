"use client";
import { useEffect, useState } from "react";
import { Sparkline } from "@/components/asset/AssetCharts";
const RANGES = ["1s", "1m", "3m", "1a", "5a"] as const;
export function PortfolioPeriodChart({
  holdings,
  displayCurrency,
}: {
  holdings: Array<{ symbol: string; quantity: number }>;
  displayCurrency: string;
}) {
  const [range, setRange] = useState<(typeof RANGES)[number]>("1s");
  const [points, setPoints] = useState<number[]>([]);
  const [pct, setPct] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!holdings.length) { setPoints([]); return; }
    const q = holdings.map((h) => `${h.symbol}:${h.quantity}`).join(",");
    let cancelled = false;
    setLoading(true);
    fetch(`/api/portfolio-history?holdings=${encodeURIComponent(q)}&range=${range}&display=${displayCurrency}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setPoints((d.points || []).map((p: { value: number }) => p.value));
        setPct(d.periodChangePercent != null ? Number(d.periodChangePercent) : null);
      })
      .catch(() => { if (!cancelled) setPoints([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [holdings, range, displayCurrency]);
  const positive = (pct ?? 0) >= 0;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">{RANGES.map((r) => <button key={r} type="button" className={range === r ? "ui-chip ui-chip-active" : "ui-chip"} onClick={() => setRange(r)}>{r}</button>)}</div>
      {loading ? <p className="text-xs text-muted">Cargando serie…</p> : null}
      {pct != null ? <p className={positive ? "text-success text-xs" : "text-danger text-xs"}>{positive ? "+" : ""}{pct.toFixed(2)}% en el periodo</p> : null}
      {points.length > 1 ? <Sparkline data={points} positive={positive} /> : !loading ? <p className="text-xs text-muted">Sin serie (Yahoo puede no responder desde el servidor).</p> : null}
    </div>
  );
}
