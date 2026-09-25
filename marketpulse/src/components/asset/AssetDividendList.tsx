"use client";
import Link from "next/link";
import { getFibraMeta, splitFibraDistribution } from "@/lib/fibra-meta";
function fmt(n: number, d = 2) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d });
}
export function AssetDividendList({
  symbol,
  assetType,
  divYield,
  dividends,
}: {
  symbol: string;
  assetType?: string;
  divYield?: number | null;
  dividends: Array<{ date: string; amount: number }>;
}) {
  if (!dividends.length) return null;
  const isFibra = assetType === "fibra" || !!getFibraMeta(symbol);
  const meta = isFibra ? getFibraMeta(symbol) : null;
  const maxAmt = Math.max(...dividends.map((x) => x.amount), 0.01);
  return (
    <section className="bg-card rounded-xl border border-border p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold">{isFibra ? "Distribuciones" : "Dividendos"}</h2>
        <Link href={`/dividends?symbol=${encodeURIComponent(symbol)}`} className="text-xs text-primary font-medium">Ver más</Link>
      </div>
      {divYield != null ? <p className="text-2xl font-bold mb-3">{fmt(Number(divYield), 2)}% <span className="text-xs font-normal text-muted">rentabilidad</span></p> : null}
      {dividends.slice(0, 6).map((d, i) => {
        const pct = Math.min(100, (d.amount / maxAmt) * 100);
        const split = isFibra ? splitFibraDistribution(Number(d.amount), meta) : null;
        return (
          <div key={`${d.date}-${i}`} className="mb-3">
            <div className="flex justify-between text-sm"><span>{d.date}</span><span className="font-medium">{fmt(d.amount, 4)}</span></div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden mt-1"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
            {split?.fiscal != null ? <p className="text-[10px] text-muted">fiscal {fmt(split.fiscal, 4)} · capital {split.capital != null ? fmt(split.capital, 4) : "—"}</p> : null}
          </div>
        );
      })}
    </section>
  );
}
