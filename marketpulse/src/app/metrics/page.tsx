"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
type Row = { symbol: string; name: string; type: "stock" | "etf"; region: "US" | "MX"; currency: string; price: number | null; pe: number | null; peg: number | null; pb: number | null; roe: number | null; divYieldPct: number | null; undervalued: boolean | null };
export default function MetricsPage() {
  const [q, setQ] = useState("AAPL,MSFT,AMXL.MX");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/metrics?symbols=${encodeURIComponent(q)}`);
      const data = await res.json();
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, [q]);
  useEffect(() => { void load(); }, [load]);
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto"><h1 className="text-lg font-bold">Métricas</h1></div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        <input className="ui-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tickers separados por coma" />
        <button type="button" className="ui-btn ui-btn-primary w-full" onClick={() => void load()}>{loading ? "Cargando…" : "Actualizar"}</button>
        {rows.map((r) => (
          <Link key={r.symbol} href={`/asset/${encodeURIComponent(r.symbol)}`} className="block bg-card border border-border rounded-xl p-3">
            <p className="font-semibold text-sm">{r.symbol} · {r.name}</p>
            <p className="text-xs text-muted">P/E {r.pe ?? "—"} · PEG {r.peg ?? "—"} · P/B {r.pb ?? "—"} · ROE {r.roe ?? "—"} · yield {r.divYieldPct ?? "—"}</p>
          </Link>
        ))}
      </main>
    </div>
  );
}
