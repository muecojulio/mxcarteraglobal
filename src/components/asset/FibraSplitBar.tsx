"use client";
import { getFibraMeta, splitFibraDistribution } from "@/lib/fibra-meta";
function fmt(n: number, d = 4) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d });
}
export function FibraSplitBar({ symbol, lastAmount }: { symbol: string; lastAmount: number }) {
  const meta = getFibraMeta(symbol);
  if (!meta) return null;
  const split = splitFibraDistribution(lastAmount, meta);
  return (
    <section className="bg-card rounded-xl border border-border p-4 mb-4">
      <h2 className="text-sm font-semibold mb-2">Composición de la distribución</h2>
      <div className="grid grid-cols-2 gap-2 mb-2 text-sm">
        <div>
          <p className="text-muted text-[11px]">Resultado fiscal</p>
          <p className="font-semibold">{split.fiscal != null ? `${fmt(split.fiscal)} $ / CBFI` : "N/D"}</p>
        </div>
        <div>
          <p className="text-muted text-[11px]">Reembolso de capital</p>
          <p className="font-semibold">{split.capital != null ? `≈ ${fmt(split.capital)} $ / CBFI` : "N/D"}</p>
        </div>
      </div>
      {meta.fiscalResultPct != null && meta.capitalReturnPct != null ? (
        <div className="h-2.5 rounded-full bg-secondary overflow-hidden flex mb-2" role="img" aria-label={`Distribución estimada: ${meta.fiscalResultPct}% resultado fiscal y ${meta.capitalReturnPct}% reembolso de capital`}>
          <div className="h-full bg-amber-500/90" style={{ width: `${meta.fiscalResultPct}%` }} />
          <div className="h-full bg-sky-500/80" style={{ width: `${meta.capitalReturnPct}%` }} />
        </div>
      ) : null}
      <div className="flex gap-3 text-[10px] text-muted mb-2">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500/90" />Resultado fiscal</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-sky-500/80" />Reembolso de capital</span>
      </div>
      {meta.distributionNote ? <p className="text-[10px] text-muted">{meta.distributionNote}</p> : null}
    </section>
  );
}
