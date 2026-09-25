"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { pushRecentSymbol } from "@/lib/persist";
import { useUsdMxn, toMxn, formatMxn } from "@/lib/fx";
import { getFibraMeta, splitFibraDistribution } from "@/lib/fibra-meta";
import { isSicSymbol } from "@/lib/sic-catalog";
import { Sparkline, IncomeChart, fmtPct } from "@/components/asset/AssetCharts";
import { TaxSharesPanel } from "@/components/asset/TaxSharesPanel";

const RANGES = ["1d", "5d", "1mo", "6mo", "1y", "5y"] as const;
type AssetPayload = {
  quote: { symbol: string; name: string; price: number; changePercent: number; currency: string } | null;
  stats: Record<string, number | null | undefined>;
  finance: { roe?: number | null; income: Array<{ year: string; revenue: number; netIncome: number; margin: number }> };
  dividends: Array<{ date: string; amount: number; currency?: string }>;
};

export default function AssetPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = decodeURIComponent(String(params.symbol || "")).toUpperCase();
  const [range, setRange] = useState<(typeof RANGES)[number]>("1y");
  const [tab, setTab] = useState<"resumen" | "divs" | "fiscal">("resumen");
  const [data, setData] = useState<AssetPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { fx } = useUsdMxn(120_000);
  useEffect(() => { if (symbol) pushRecentSymbol(symbol); }, [symbol]);
  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    fetch(`/api/asset?symbol=${encodeURIComponent(symbol)}&range=${range}`)
      .then(async (res) => { const j = await res.json(); if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`); return j as AssetPayload; })
      .then((j) => { if (!cancelled) { setData(j); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Error"); });
    return () => { cancelled = true; };
  }, [symbol, range]);
  const q = data?.quote;
  const fibra = getFibraMeta(symbol);
  const lastDiv = data?.dividends?.[0]?.amount ?? 0;
  const split = splitFibraDistribution(lastDiv, fibra);
  const spark = (data?.dividends || []).slice(0, 24).map((d) => d.amount).reverse();
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
          <Link href="/" className="text-primary text-sm">←</Link>
          <h1 className="text-lg font-bold truncate">{symbol}</h1>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        {error ? <p className="text-danger text-sm">{error}</p> : null}
        <p className="text-sm text-muted">{q?.name || "Instrumento"}{isSicSymbol(symbol) ? " · SIC" : ""}{fibra ? " · FIBRA" : ""}</p>
        <p className="text-2xl font-bold">{q ? formatMxn(toMxn(q.price, q.currency, fx?.usdMxn ?? null)) : "—"}</p>
        {q ? <p className={q.changePercent >= 0 ? "text-success text-sm" : "text-danger text-sm"}>{fmtPct(q.changePercent)}</p> : null}
        <div className="flex flex-wrap gap-1">{RANGES.map((r) => <button key={r} type="button" className={range === r ? "ui-chip ui-chip-active" : "ui-chip"} onClick={() => setRange(r)}>{r}</button>)}</div>
        {spark.length > 1 ? <Sparkline data={spark} positive={(spark.at(-1) ?? 0) >= (spark[0] ?? 0)} /> : null}
        <div className="flex gap-2">{(["resumen", "divs", "fiscal"] as const).map((t) => <button key={t} type="button" className={tab === t ? "ui-chip ui-chip-active" : "ui-chip"} onClick={() => setTab(t)}>{t}</button>)}</div>
        {tab === "resumen" && (
          <div className="text-xs text-muted space-y-1">
            <p>P/E {data?.stats?.pe ?? "—"} · PEG {data?.stats?.peg ?? "—"} · P/B {data?.stats?.pb ?? "—"} · ROE {data?.finance?.roe ?? "—"}</p>
            <IncomeChart income={data?.finance?.income || []} />
          </div>
        )}
        {tab === "divs" && (data?.dividends || []).slice(0, 12).map((d, i) => <p key={i} className="text-xs">{d.date} · {d.amount}</p>)}
        {tab === "fiscal" && (
          <>
            {fibra ? <p className="text-xs text-muted">Fiscal {split.fiscal ?? "—"} / capital {split.capital ?? "—"}</p> : null}
            <TaxSharesPanel symbol={symbol} lastDivAmount={lastDiv} price={q?.price} priceCurrency={q?.currency} usdMxn={fx?.usdMxn ?? null} />
          </>
        )}
      </main>
    </div>
  );
}
