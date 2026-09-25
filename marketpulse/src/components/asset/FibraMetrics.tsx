"use client";
import { useEffect, useState } from "react";
import { getFibraMeta } from "@/lib/fibra-meta";
export function FibraMetrics({
  symbol,
  price,
  dividends,
  riskFreeMx,
}: {
  symbol: string;
  price?: number;
  dividends: Array<{ amount: number }>;
  riskFreeMx?: number | null;
}) {
  const meta = getFibraMeta(symbol);
  const [rfFetched, setRfFetched] = useState<number | null>(riskFreeMx ?? null);
  useEffect(() => {
    if (riskFreeMx != null) { setRfFetched(riskFreeMx); return; }
    let cancelled = false;
    fetch("/api/risk-free")
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d.mxAnnualPct != null) setRfFetched(Number(d.mxAnnualPct)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [riskFreeMx]);
  if (!meta) return null;
  const divs = dividends || [];
  let yieldPct: number | null = null;
  if (divs.length && price) {
    const annual = divs.length >= 4 ? divs.slice(0, 4).reduce((s, d) => s + d.amount, 0) : divs[0].amount * 4;
    yieldPct = (annual / price) * 100;
  }
  const rf = rfFetched;
  const spread = yieldPct != null && rf != null ? yieldPct - rf : null;
  return (
    <section className="bg-card rounded-xl border border-border p-4 mb-4">
      <h2 className="text-sm font-semibold mb-2">Métricas FIBRA / REIT</h2>
      <p className="text-xs text-muted">{meta.focus}</p>
      <p className="text-xs"><span className="text-muted">Tipo de inmueble: </span><span className="font-medium">{meta.propertyTypes.join(" · ")}</span></p>
      <p className="text-xs mb-3"><span className="text-muted">Ocupación: </span><span className="font-medium">{meta.occupancyPct != null ? `${meta.occupancyPct}%` : "N/D en APIs free (ver reporte trimestral)"}</span></p>
      <p className="text-[11px] text-muted mb-3">Yield de distribución vs tasa libre de riesgo MX (aprox. FRED). No sustituye el cap rate.</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-background rounded-lg p-2 border border-border"><p className="text-lg font-bold">{yieldPct != null ? `${yieldPct.toFixed(2)}%` : "—"}</p><p className="text-[10px] text-muted">Rend. dividendo</p></div>
        <div className="bg-background rounded-lg p-2 border border-border"><p className="text-lg font-bold">{rf != null ? `${rf.toFixed(2)}%` : "—"}</p><p className="text-[10px] text-muted">Tasa libre MX</p></div>
        <div className="bg-background rounded-lg p-2 border border-border"><p className={`text-lg font-bold ${spread != null && spread >= 0 ? "text-success" : "text-danger"}`}>{spread != null ? `${spread.toFixed(2)} pp` : "—"}</p><p className="text-[10px] text-muted">Spread</p></div>
      </div>
    </section>
  );
}
