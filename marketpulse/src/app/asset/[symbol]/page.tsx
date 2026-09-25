"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { pushRecentSymbol } from "@/lib/persist";
import { useUsdMxn, toMxn, formatMxn } from "@/lib/fx";
import { useQuotes, useDividends } from "@/lib/market-data/client";
import { getFibraMeta, splitFibraDistribution } from "@/lib/fibra-meta";
import { isSicSymbol } from "@/lib/sic-catalog";
import { estimateDividendTax, detectTaxAssetKind } from "@/lib/tax-mx";

export default function AssetPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = decodeURIComponent(String(params.symbol || "")).toUpperCase();
  const [tab, setTab] = useState<"resumen" | "divs" | "fiscal">("resumen");
  useEffect(() => { if (symbol) pushRecentSymbol(symbol); }, [symbol]);
  const { data } = useQuotes(symbol ? [symbol] : [], 30_000);
  const { data: divs } = useDividends(symbol || null);
  const { fx } = useUsdMxn();
  const q = data?.quotes[0];
  const fibra = getFibraMeta(symbol);
  const lastDiv = divs?.dividends?.[0]?.amount ?? 0;
  const split = splitFibraDistribution(lastDiv, fibra);
  const tax = estimateDividendTax({ grossDividend: lastDiv || 1, assetKind: detectTaxAssetKind(symbol), scenario: "w8ben" });
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
          <Link href="/" className="text-primary text-sm">←</Link>
          <h1 className="text-lg font-bold truncate">{symbol}</h1>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        <p className="text-sm text-muted">{q?.name || "Instrumento"} {isSicSymbol(symbol) ? "· SIC" : ""}</p>
        <p className="text-2xl font-bold">{q ? formatMxn(toMxn(q.price, q.currency, fx?.usdMxn ?? null)) : "—"}</p>
        {q ? <p className={q.changePercent >= 0 ? "text-success text-sm" : "text-danger text-sm"}>{q.changePercent.toFixed(2)}%</p> : null}
        <div className="flex gap-2">{(["resumen", "divs", "fiscal"] as const).map((t) => <button key={t} type="button" className={tab === t ? "ui-chip ui-chip-active" : "ui-chip"} onClick={() => setTab(t)}>{t}</button>)}</div>
        {tab === "resumen" && <p className="text-sm text-muted">Precios de APIs de terceros; pueden tener retraso. {fibra ? `FIBRA: ${fibra.focus}` : ""}</p>}
        {tab === "divs" && (
          <div className="space-y-1">
            {(divs?.dividends || []).slice(0, 8).map((d, i) => <p key={i} className="text-xs">{d.date} · {d.amount} {d.currency}</p>)}
            {fibra ? <p className="text-xs text-muted">Desglose orientativo fiscal {split.fiscal ?? "—"} / capital {split.capital ?? "—"}</p> : null}
          </div>
        )}
        {tab === "fiscal" && <p className="text-sm text-muted">Estimado W-8BEN neto ≈ {tax.netApprox.toFixed(2)} por unidad de dividendo. No es asesoría.</p>}
        <Link href="/analysis" className="ui-btn ui-btn-primary w-full">Análisis</Link>
      </main>
    </div>
  );
}
