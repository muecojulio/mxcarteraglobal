"use client";
function fmt(n: number, d = 2) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}
type Rec = { strongBuy: number; buy: number; hold: number; sell: number; strongSell: number };
type Target = { consensus?: number | null; median?: number | null; high?: number | null; low?: number | null; lastQuarterAvg?: number | null; lastQuarterCount?: number | null };
type Earn = { period: string; estimate: number | null; actual: number | null; surprisePercent?: number | null };
export function AssetAnalysts({
  recommendation,
  priceTarget,
  earnings,
  price,
}: {
  recommendation?: Rec | null;
  priceTarget?: Target | null;
  earnings?: Earn[];
  price?: number;
}) {
  const rec = recommendation;
  const t = priceTarget;
  const rows = earnings || [];
  const buyPct = rec ? Math.round(((rec.strongBuy + rec.buy) / (rec.strongBuy + rec.buy + rec.hold + rec.sell + rec.strongSell || 1)) * 100) : null;
  const tgt = t ? Number(t.consensus ?? t.lastQuarterAvg ?? 0) : 0;
  if (!rec && !t && rows.length === 0) return null;
  return (
    <>
      {(rec || t) ? (
        <section className="bg-card rounded-xl border border-border p-4 mb-4">
          <h2 className="text-sm font-semibold mb-3">Calificaciones de analistas</h2>
          {t && (t.consensus != null || t.lastQuarterAvg != null) ? (
            <div className="mb-4">
              <p className="text-2xl font-bold">{fmt(tgt, 2)} $</p>
              <p className="text-xs text-muted">Precio objetivo promedio</p>
              <p className="text-[11px] text-muted mt-1.5">
                {t.high != null && t.low != null ? `Estimación más alta ${fmt(Number(t.high), 2)} $. Más baja ${fmt(Number(t.low), 2)} $. ` : ""}
                {t.lastQuarterCount != null ? `Basado en ~${t.lastQuarterCount} objetivos. ` : ""}
                No es una recomendación de inversión.
              </p>
              {price && tgt ? (
                <p className="text-xs mt-2">vs precio actual: <span className={tgt >= price ? "text-success font-medium" : "text-danger font-medium"}>{fmtPct(((tgt - price) / price) * 100)}</span></p>
              ) : null}
            </div>
          ) : null}
          {rec && buyPct != null ? (
            <>
              <div className="flex items-center justify-between mb-2"><span className="text-sm">Comprar</span><span className="text-sm font-semibold">{buyPct}%</span></div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden mb-3"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${buyPct}%` }} /></div>
              <p className="text-[11px] text-muted">Strong buy {rec.strongBuy} · Buy {rec.buy} · Hold {rec.hold} · Sell {rec.sell + rec.strongSell}.</p>
            </>
          ) : null}
        </section>
      ) : null}
      {rows.length > 0 ? (
        <section className="bg-card rounded-xl border border-border p-4 mb-4">
          <h2 className="text-sm font-semibold mb-3">Resultados financieros (EPS)</h2>
          {rows.slice(0, 6).map((e) => (
            <div key={e.period} className="flex items-center justify-between text-sm py-1">
              <span>{e.period}</span>
              <span>est {e.estimate ?? "—"} · real {e.actual ?? "—"}{e.surprisePercent != null ? ` · ${fmtPct(e.surprisePercent)}` : ""}</span>
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
}
