"use client";

import { useEffect, useState } from "react";
import { Sparkline } from "@/components/asset/AssetCharts";
import { ScrollableChips } from "@/components/ui/ScrollableChips";

const RANGES = ["1s", "1m", "3m", "1a", "5a"] as const;

type PortfolioSeries = { key: string; points: number[]; percent: number | null };
type HistoryResponse = { points?: Array<{ value: number }>; periodChangePercent?: number | null };

export function PortfolioPeriodChart({
  holdings,
  displayCurrency,
}: {
  holdings: Array<{ symbol: string; quantity: number }>;
  displayCurrency: string;
}) {
  const [range, setRange] = useState<(typeof RANGES)[number]>("1s");
  const holdingsKey = holdings.map((holding) => `${holding.symbol}:${holding.quantity}`).join(",");
  const requestKey = `${holdingsKey}|${range}|${displayCurrency}`;
  const [series, setSeries] = useState<PortfolioSeries | null>(null);
  const currentSeries = series?.key === requestKey ? series : null;
  const points = currentSeries?.points ?? [];
  const pct = currentSeries?.percent ?? null;
  const loading = !!holdingsKey && !currentSeries;

  useEffect(() => {
    if (!holdingsKey) return;
    let cancelled = false;
    fetch(`/api/portfolio-history?holdings=${encodeURIComponent(holdingsKey)}&range=${range}&display=${displayCurrency}`)
      .then((response) => response.json() as Promise<HistoryResponse>)
      .then((data) => {
        if (cancelled) return;
        setSeries({
          key: requestKey,
          points: (data.points ?? []).map((point) => point.value),
          percent: data.periodChangePercent != null ? Number(data.periodChangePercent) : null,
        });
      })
      .catch(() => {
        if (!cancelled) setSeries({ key: requestKey, points: [], percent: null });
      });
    return () => { cancelled = true; };
  }, [holdingsKey, range, displayCurrency, requestKey]);

  const positive = (pct ?? 0) >= 0;
  return (
    <div className="space-y-2">
      <ScrollableChips
        label="Periodo de evolución de cartera"
        options={RANGES.map((item) => ({ value: item, label: item }))}
        value={range}
        onChange={setRange}
      />
      {loading ? <p className="text-xs text-muted" role="status" aria-live="polite">Cargando serie…</p> : null}
      {pct != null ? <p className={positive ? "text-success text-xs" : "text-danger text-xs"}>{positive ? "+" : ""}{pct.toFixed(2)}% en el periodo</p> : null}
      {points.length > 1 ? <Sparkline data={points} positive={positive} /> : !loading ? <p className="text-xs text-muted">Sin serie (Yahoo puede no responder desde el servidor).</p> : null}
    </div>
  );
}
