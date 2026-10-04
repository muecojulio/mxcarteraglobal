"use client";
import { useRef, useState } from "react";
export function fmt(n: number, d = 2) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d });
}
export function fmtPct(n: number) { return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`; }
export function fmtMoney(n: number) {
  if (Math.abs(n) >= 1e12) return `${(n / 1e12).toFixed(2)} T`;
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(0)} mil M`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(0)} M`;
  return fmt(n, 0);
}
export function Sparkline({ data, positive, formatValue }: { data: number[]; positive: boolean; formatValue?: (n: number) => string }) {
  const [active, setActive] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  if (!data.length) return <div className="h-44 flex items-center justify-center text-muted text-sm">Sin datos del periodo</div>;
  const w = 360, h = 160, pad = 8;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const xy = data.map((v, i) => ({ x: pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2), y: pad + (1 - (v - min) / range) * (h - pad * 2), v, i }));
  const points = xy.map((p) => `${p.x},${p.y}`).join(" ");
  const stroke = positive ? "#22c55e" : "#ef4444";
  const pick = (clientX: number) => {
    const el = ref.current; if (!el) return;
    const rel = (clientX - el.getBoundingClientRect().left) / el.getBoundingClientRect().width;
    setActive(Math.max(0, Math.min(data.length - 1, Math.round(rel * (data.length - 1)))));
  };
  const fmtVal = formatValue || ((n: number) => n.toFixed(2));
  const a = active != null ? xy[active] : null;
  return (
    <div ref={ref} className="relative select-none touch-none" onMouseMove={(e) => pick(e.clientX)} onMouseLeave={() => setActive(null)} onTouchStart={(e) => { if (e.touches[0]) pick(e.touches[0].clientX); }} onTouchMove={(e) => { if (e.touches[0]) pick(e.touches[0].clientX); }} onTouchEnd={() => setActive(null)}>
      {a ? <p className="text-sm font-bold text-center">{fmtVal(a.v)}</p> : null}
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-44" preserveAspectRatio="none">
        <polyline fill="none" stroke={stroke} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" points={points} />
        {a ? <circle cx={a.x} cy={a.y} r={5} fill={stroke} stroke="#fff" strokeWidth={2} /> : null}
      </svg>
      {!a ? <p className="text-[10px] text-muted text-center">Mantén presionado el gráfico para ver el precio</p> : null}
    </div>
  );
}
export function IncomeChart({ income }: { income: Array<{ year: string; revenue: number; netIncome: number; margin: number }> }) {
  if (!income.length) return null;
  const maxRev = Math.max(...income.map((i) => i.revenue), 1);
  return (
    <div className="mt-3">
      <div className="flex items-end gap-1.5 h-28">
        {income.map((row) => (
          <div key={row.year} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
            <div className="w-full max-w-[28px] bg-blue-500/80 rounded-t" style={{ height: `${Math.max(8, (row.revenue / maxRev) * 100)}%` }} />
            <div className="w-full max-w-[28px] bg-emerald-400/90 rounded-t" style={{ height: `${Math.max(4, (Math.abs(row.netIncome) / maxRev) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1">{income.map((row) => <div key={row.year} className="flex-1 text-center text-[10px] text-muted">{row.year}</div>)}</div>
      <p className="text-[11px] text-muted mt-2">Ingresos / ingreso neto</p>
    </div>
  );
}
