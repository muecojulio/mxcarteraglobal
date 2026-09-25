"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
type Row = { symbol: string; name: string; type: "stock" | "etf"; pe: number | null; roe: number | null; divYieldPct: number | null; undervalued: boolean | null };
export default function MetricsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<"all" | "stock" | "etf">("all");
  const [undervalued, setUndervalued] = useState(false);
  useEffect(() => {
    let cancel = false;
    fetch("/api/metrics").then(async (r) => (r.ok ? r.json() : { rows: [] })).then((j) => { if (!cancel) setRows(j.rows || []); }).catch(() => { if (!cancel) setRows([]); }).finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, []);
  const shown = useMemo(() => rows.filter((r) => (type === "all" || r.type === type) && (!undervalued || r.undervalued)), [rows, type, undervalued]);
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto"><h1 className="text-lg font-bold">Métricas</h1></div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        <div className="flex gap-2">
          {(["all", "stock", "etf"] as const).map((t) => (
            <button key={t} type="button" className={type === t ? "ui-chip ui-chip-active" : "ui-chip"} onClick={() => setType(t)}>{t}</button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Solo infravaloradas</span>
          <button type="button" className="ui-switch" role="switch" aria-checked={undervalued} onClick={() => setUndervalued((v) => !v)}>
            <span className="ui-switch-track"><span className="ui-switch-thumb" /></span>
          </button>
        </div>
        {loading ? <p className="text-sm text-muted">Cargando…</p> : shown.map((r) => (
          <Link key={r.symbol} href={`/asset/${encodeURIComponent(r.symbol)}`} className="block bg-card border border-border rounded-xl p-3">
            <p className="font-semibold text-sm">{r.symbol} <span className="text-muted font-normal">{r.name}</span></p>
            <p className="text-xs text-muted">PER {r.pe ?? "—"} · ROE {r.roe ?? "—"} · Yield {r.divYieldPct ?? "—"}%</p>
          </Link>
        ))}
      </main>
    </div>
  );
}
