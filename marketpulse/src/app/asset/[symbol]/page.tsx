"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { pushRecentSymbol } from "@/lib/persist";
import { useUsdMxn, toMxn, formatMxn } from "@/lib/fx";
import { useQuotes, useDividends } from "@/lib/market-data/client";
import { getFibraMeta, splitFibraDistribution } from "@/lib/fibra-meta";
import { isSicSymbol } from "@/lib/sic-catalog";
import { Sparkline, IncomeChart, fmtPct } from "@/components/asset/AssetCharts";
import { TaxSharesPanel } from "@/components/asset/TaxSharesPanel";

const RANGES = ["1d", "5d", "1mo", "6mo", "1y", "5y"] as const;

export default function AssetPage() {
  const params = useParams<{ symbol: string }>();
  const raw = decodeURIComponent(String(params.symbol || ""));
  const symbol = raw.toUpperCase();
  const [tab, setTab] = useState<"resumen" | "divs" | "fiscal">("resumen");
  const [range, setRange] = useState<(typeof RANGES)[number]>("1d");
  const [riskFreeMx, setRiskFreeMx] = useState<number | null>(null);
  useEffect(() => { if (symbol) pushRecentSymbol(symbol); }, [symbol]);
  useEffect(() => {
    fetch("/api/public-finance?series=DGS10").then((r) => r.json()).then((j) => {
      const rows = j?.fred?.rows as Array<{ value: number | null }> | undefined;
      const last = [...(rows || [])].reverse().find((x) => x.value != null);
      if (last?.value != null) setRiskFreeMx(last.value);
    }).catch(() => undefined);
  }, []);
  const { data } = useQuotes(symbol ? [symbol] : [], 30_000);
  const { data: divs } = useDividends(symbol || null);
  const { fx } = useUsdMxn(120_000);
  const q = data?.quotes[0];
  const fibra = getFibraMeta(symbol);
  const lastDiv = divs?.dividends?.[0]?.amount ?? 0;
  const split = splitFibraDistribution(lastDiv, fibra);
  const spark = (divs?.dividends || []).slice(0, 24).map((d) => d.amount).reverse();
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
          <Link href="/" className="text-primary text-sm">←</Link>
          <h1 className="text-lg font-bold truncate">{symbol}</h1>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        <p className="text-sm text-muted">{q?.name || "Instrumento"}{isSicSymbol(symbol) ? " · SIC" : ""}{fibra ? " · FIBRA" : ""}</p>
        <p className="text-2xl font-bold">{q ? formatMxn(toMxn(q.price, q.currency, fx?.usdMxn ?? null)) : "—"}</p>
        {q ? <p className={q.changePercent >= 0 ? "text-success text-sm" : "text-danger text-sm"}>{fmtPct(q.changePercent)}</p> : null}
        <div className="flex flex-wrap gap-1">{RANGES.map((r) => <button key={r} type="button" className={range === r ? "ui-chip ui-chip-active" : "ui-chip"} onClick={() => setRange(r)}>{r}</button>)}</div>
        {spark.length > 1 ? <Sparkline data={spark} positive={(spark.at(-1) ?? 0) >= (spark[0] ?? 0)} /> : <p className="text-xs text-muted">Sin serie de precios para {range} en esta versión (el ZIP usa /api/asset, que no venía en la carpeta).</p>}
        <div className="flex gap-2">{(["resumen", "divs", "fiscal"] as const).map((t) => <button key={t} type="button" className={tab === t ? "ui-chip ui-chip-active" : "ui-chip"} onClick={() => setTab(t)}>{t}</button>)}</div>
        {tab === "resumen" && (
          <>
            {riskFreeMx != null ? <p className="text-xs text-muted">Treasury 10Y (FRED) {riskFreeMx.toFixed(2)}%</p> : null}
            <IncomeChart income={[]} />
          </>
        )}
        {tab === "divs" && (divs?.dividends || []).slice(0, 12).map((d, i) => <p key={i} className="text-xs">{d.date} · {d.amount} {d.currency}</p>)}
        {tab === "fiscal" && (
          <>
            {fibra ? <p className="text-xs text-muted">Desglose fiscal {split.fiscal ?? "—"} / capital {split.capital ?? "—"}</p> : null}
            <TaxSharesPanel symbol={symbol} lastDivAmount={lastDiv} price={q?.price} priceCurrency={q?.currency} usdMxn={fx?.usdMxn ?? null} />
          </>
        )}
      </main>
    </div>
  );
}
