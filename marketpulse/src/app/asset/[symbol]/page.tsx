"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { pushRecentSymbol } from "@/lib/persist";
import { useUsdMxn, toMxn, formatMxn } from "@/lib/fx";
import { getFibraMeta, splitFibraDistribution } from "@/lib/fibra-meta";
import { isSicSymbol } from "@/lib/sic-catalog";
import { Sparkline, IncomeChart, fmtPct } from "@/components/asset/AssetCharts";
import { TaxSharesPanel } from "@/components/asset/TaxSharesPanel";

const RANGES = ["1d", "5d", "1mo", "6mo", "1y", "5y"] as const;
type Candle = { t: number; o: number; h: number; l: number; c: number };
type AssetPayload = {
  quote: { symbol: string; name: string; price: number; changePercent: number; currency: string; change?: number } | null;
  profile: { name?: string; exchange?: string } | null;
  history: Candle[];
  stats: Record<string, number | null | undefined>;
  finance: { roe?: number | null; debtEquity?: number | null; income: Array<{ year: string; revenue: number; netIncome: number; margin: number }> };
  recommendation: { strongBuy: number; buy: number; hold: number; sell: number; strongSell: number } | null;
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
  const closes = useMemo(() => (data?.history || []).map((h) => h.c), [data]);
  const chartTimes = useMemo(() => (data?.history || []).map((h) => h.t), [data]);
  const chartPositive = closes.length >= 2 ? closes[closes.length - 1] >= closes[0] : (quote?.changePercent ?? 0) >= 0;
  const buyPct = useMemo(() => {
    const r = data?.recommendation;
    if (!r) return null;
    const total = r.strongBuy + r.buy + r.hold + r.sell + r.strongSell || 1;
    return Math.round(((r.strongBuy + r.buy) / total) * 100);
  }, [data]);
  const fibra = getFibraMeta(symbol);
  const lastDiv = data?.dividends?.[0]?.amount ?? 0;
  const split = splitFibraDistribution(lastDiv, fibra);
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
        {spark.length > 1 ? <Sparkline data={spark} times={chartTimes} positive={chartPositive} formatValue={(n) => formatMxn(toMxn(n, quote?.currency || "USD", fx?.usdMxn ?? null))} /> : null}
        {buyPct != null ? <p className="text-xs text-muted">Consenso compra {buyPct}%</p> : null}
        <div className="flex gap-2">{(["resumen", "divs", "fiscal"] as const).map((t) => <button key={t} type="button" className={tab === t ? "ui-chip ui-chip-active" : "ui-chip"} onClick={() => setTab(t)}>{t}</button>)}</div>
        {tab === "resumen" && (
          <div className="text-xs space-y-1">
            <p>P/E {data?.stats?.pe ?? "—"} · PEG {data?.stats?.peg ?? "—"} · P/B {data?.stats?.pb ?? "—"} · P/S {data?.stats?.ps ?? "—"}</p>
            <p>ROE {data?.finance?.roe ?? "—"} · D/E {data?.finance?.debtEquity ?? "—"} · 52w {data?.stats?.low52 ?? "—"}–{data?.stats?.high52 ?? "—"}</p>
            <IncomeChart income={data?.finance?.income || []} />
            <Link href="/analysis" className="text-primary">Análisis textual</Link>
          </div>
        )}
        {tab === "divs" && (data?.dividends || []).slice(0, 16).map((d, i) => <p key={i} className="text-xs">{d.date} · {d.amount}</p>)}
        {tab === "fiscal" && (
          <>
            {fibra ? <p className="text-xs text-muted">Fiscal {split.fiscal ?? "—"} / capital {split.capital ?? "—"} · {fibra.focus}</p> : null}
            <TaxSharesPanel symbol={symbol} lastDivAmount={lastDiv} price={quote?.price} priceCurrency={quote?.currency} usdMxn={fx?.usdMxn ?? null} />
          </>
        )}
      </main>
    </div>
  );
}
