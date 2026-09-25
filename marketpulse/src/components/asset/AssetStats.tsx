"use client";
function fmt(n: number, d = 2) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtBig(n?: number | null) {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)} T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)} M`;
  return fmt(n, 0);
}
export function AssetStats({
  quote,
  stats,
}: {
  quote?: { low?: number; high?: number; volume?: number } | null;
  stats?: Record<string, number | null | undefined>;
}) {
  const s = stats || {};
  const rows: Array<[string, string]> = [
    ["Rango diario", `${(quote?.low ?? s.dayLow) != null ? fmt(Number(quote?.low ?? s.dayLow)) : "—"} – ${(quote?.high ?? s.dayHigh) != null ? fmt(Number(quote?.high ?? s.dayHigh)) : "—"}`],
    ["Rango 52S", `${s.low52 != null ? fmt(Number(s.low52)) : "—"} – ${s.high52 != null ? fmt(Number(s.high52)) : "—"}`],
    ["Volumen", quote?.volume != null ? `${(quote.volume / 1e6).toFixed(2)}M` : "—"],
    ["Vol. promedio", s.avgVolume != null ? `${Number(s.avgVolume).toFixed(1)}M` : "—"],
    ["Relación P/E", s.pe != null ? fmt(Number(s.pe), 2) : "—"],
    ["Cap. bursátil", fmtBig(s.marketCap ?? null)],
    ["PEG", s.peg != null ? fmt(Number(s.peg), 2) : "—"],
    ["P/B", s.pb != null ? fmt(Number(s.pb), 2) : "—"],
  ];
  return (
    <section className="bg-card rounded-xl border border-border p-4 mb-4">
      <h2 className="text-sm font-semibold mb-3">Estadísticas</h2>
      <div className="space-y-3 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2"><span className="text-muted">{k}</span><span className="font-medium">{v}</span></div>
        ))}
      </div>
    </section>
  );
}
