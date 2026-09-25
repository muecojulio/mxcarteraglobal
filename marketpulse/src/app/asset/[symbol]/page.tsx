"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { pushRecentSymbol } from "@/lib/persist";
import { useUsdMxn, toMxn, formatMxn } from "@/lib/fx";
import { getFibraMeta } from "@/lib/fibra-meta";
import { isSicSymbol } from "@/lib/sic-catalog";
import { Sparkline, IncomeChart, fmtPct } from "@/components/asset/AssetCharts";
import { TaxSharesPanel } from "@/components/asset/TaxSharesPanel";
import { AssetAnalysts } from "@/components/asset/AssetAnalysts";
import { AssetCandles } from "@/components/asset/AssetCandles";
import { FibraMetrics } from "@/components/asset/FibraMetrics";
import { FibraSplitBar } from "@/components/asset/FibraSplitBar";
import { AssetDividendList } from "@/components/asset/AssetDividendList";
import { AssetStats } from "@/components/asset/AssetStats";

const RANGES = ["1d", "5d", "1mo", "6mo", "1y", "5y"] as const;
type Candle = { t: number; o: number; h: number; l: number; c: number };
type AssetPayload = {
  quote: { symbol: string; name: string; price: number; changePercent: number; currency: string; low?: number; high?: number; volume?: number } | null;
  profile: { name?: string } | null;
  history: Candle[];
  stats: Record<string, number | null | undefined>;
  finance: { roe?: number | null; debtEquity?: number | null; income: Array<{ year: string; revenue: number; netIncome: number; margin: number }> };
  recommendation: { strongBuy: number; buy: number; hold: number; sell: number; strongSell: number } | null;
  priceTarget?: { consensus: number | null; lastQuarterAvg?: number | null; high?: number | null; low?: number | null; lastQuarterCount?: number | null } | null;
  earnings?: Array<{ period: string; estimate: number | null; actual: number | null; surprisePercent: number | null }>;
  dividends: Array<{ date: string; amount: number }>;
  assetType?: string;
};
export default function AssetPage() {
  const params = useParams<{ symbol: string }>();
  const router = useRouter();
  const raw = decodeURIComponent(String(params.symbol || ""));
  const symbol = raw.toUpperCase();
  const [range, setRange] = useState<(typeof RANGES)[number]>("1y");
  const [tab, setTab] = useState<"resumen" | "divs" | "fiscal">("resumen");
  const [data, setData] = useState<AssetPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { fx } = useUsdMxn(120_000);
  useEffect(() => { if (symbol) pushRecentSymbol(symbol); }, [symbol]);
  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/asset?symbol=${encodeURIComponent(symbol)}&range=${range}`)
      .then(async (res) => { const j = await res.json(); if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`); return j as AssetPayload; })
      .then((j) => { if (!cancelled) { setData(j); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Error"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol, range]);
  const quote = data?.quote ?? null;
  const history = data?.history || [];
  const closes = useMemo(() => history.map((h) => h.c), [history]);
  const chartTimes = useMemo(() => history.map((h) => h.t), [history]);
  const chartPositive = closes.length >= 2 ? closes[closes.length - 1] >= closes[0] : (quote?.changePercent ?? 0) >= 0;
  const fibra = getFibraMeta(symbol);
  const lastDiv = data?.dividends?.[0]?.amount ?? 0;
  const spark = closes.length > 1 ? closes : (data?.dividends || []).slice(0, 24).map((d) => d.amount).reverse();
  const name = data?.profile?.name || quote?.name || raw;
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center gap-2 px-3 h-14 max-w-lg mx-auto">
          <button type="button" onClick={() => router.back()} className="w-9 h-9 text-muted text-lg" aria-label="Volver">‹</button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate">{raw}</h1>
            <p className="text-[11px] text-muted truncate">{name}{isSicSymbol(raw) ? " · SIC" : ""}{fibra ? " · FIBRA" : ""}</p>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        {loading ? <p className="text-sm text-muted">Cargando…</p> : null}
        {error ? <p className="text-danger text-sm">{error}</p> : null}
        <p className="text-2xl font-bold">{quote ? formatMxn(toMxn(quote.price, quote.currency, fx?.usdMxn ?? null)) : "—"}</p>
        {quote ? <p className={(quote.changePercent ?? 0) >= 0 ? "text-success text-sm" : "text-danger text-sm"}>{fmtPct(quote.changePercent ?? 0)}</p> : null}
        <div className="flex flex-wrap gap-1">{RANGES.map((r) => <button key={r} type="button" className={range === r ? "ui-chip ui-chip-active" : "ui-chip"} onClick={() => setRange(r)}>{r}</button>)}</div>
        {history.length > 1 ? <AssetCandles history={history} /> : spark.length > 1 ? <Sparkline data={spark} times={chartTimes} positive={chartPositive} formatValue={(n) => formatMxn(toMxn(n, quote?.currency || "USD", fx?.usdMxn ?? null))} /> : null}
        <div className="flex gap-2">{(["resumen", "divs", "fiscal"] as const).map((t) => <button key={t} type="button" className={tab === t ? "ui-chip ui-chip-active" : "ui-chip"} onClick={() => setTab(t)}>{t}</button>)}</div>
        {tab === "resumen" && (
          <>
            <AssetStats quote={quote} stats={data?.stats} />
            <IncomeChart income={data?.finance?.income || []} />
            <AssetAnalysts recommendation={data?.recommendation} priceTarget={data?.priceTarget} earnings={data?.earnings} price={quote?.price} />
            <Link href="/analysis" className="text-primary text-sm">Análisis textual</Link>
          </>
        )}
        {tab === "divs" && <AssetDividendList symbol={symbol} assetType={data?.assetType} divYield={data?.stats?.divYield} dividends={data?.dividends || []} />}
        {tab === "fiscal" && (
          <>
            <FibraSplitBar symbol={symbol} lastAmount={lastDiv} />
            <FibraMetrics symbol={symbol} price={quote?.price} dividends={data?.dividends || []} />
            <TaxSharesPanel symbol={symbol} lastDivAmount={lastDiv} price={quote?.price} priceCurrency={quote?.currency} usdMxn={fx?.usdMxn ?? null} />
          </>
        )}
      </main>
    </div>
  );
}
