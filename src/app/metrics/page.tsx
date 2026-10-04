"use client";
import { useCallback, useState } from "react";
import Link from "next/link";
import { ScrollableChips } from "@/components/ui/ScrollableChips";
import { CollapsiblePanel } from "@/components/ui/CollapsiblePanel";
type Row = { symbol: string; name: string; type?: string; region?: string; pe: number | null; peg: number | null; pb: number | null; roe: number | null; divYieldPct: number | null; undervalued: boolean | null };
type Filters = { type: "all" | "stock" | "etf"; peMax: string; pegMax: string; pbMax: string; roeMin: string; undervalued: boolean };
const DEFAULT: Filters = { type: "all", peMax: "15", pegMax: "1", pbMax: "1.5", roeMin: "10", undervalued: false };
function fmt(n: number | null, d = 2) { if (n == null) return "—"; return n.toLocaleString("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d }); }
export default function MetricsPage() {
  const [filters, setFilters] = useState<Filters>(DEFAULT);
  const [results, setResults] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [q, setQ] = useState("AAPL,MSFT,JNJ,AMXL.MX,WALMEX.MX");
  const run = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams({ symbols: q, type: filters.type });
      if (filters.peMax) p.set("peMax", filters.peMax);
      if (filters.pegMax) p.set("pegMax", filters.pegMax);
      if (filters.pbMax) p.set("pbMax", filters.pbMax);
      if (filters.roeMin) p.set("roeMin", filters.roeMin);
      if (filters.undervalued) p.set("undervalued", "1");
      const res = await fetch(`/api/metrics?${p.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rows: Row[] = data.results || data.rows || [];
      setResults(rows.filter((r) => {
        if (filters.peMax && r.pe != null && r.pe > Number(filters.peMax)) return false;
        if (filters.pegMax && r.peg != null && r.peg > Number(filters.pegMax)) return false;
        if (filters.pbMax && r.pb != null && r.pb > Number(filters.pbMax)) return false;
        if (filters.roeMin && r.roe != null && r.roe < Number(filters.roeMin)) return false;
        if (filters.undervalued && !r.undervalued) return false;
        return true;
      }));
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); setResults([]); }
    finally { setLoading(false); }
  }, [filters, q]);
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto"><h1 className="text-lg font-bold">Métricas</h1></div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        <label className="sr-only" htmlFor="metrics-symbols">Tickers separados por coma</label>
        <input id="metrics-symbols" className="ui-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tickers separados por coma" />
        <button
          id="metrics-filter-toggle"
          type="button"
          className="ui-btn ui-btn-ghost w-full"
          aria-expanded={showFilters}
          aria-controls="metrics-filter-panel"
          onClick={() => setShowFilters((v) => !v)}
        >
          {showFilters ? "Ocultar filtros" : "Mostrar filtros"}
        </button>
        <CollapsiblePanel id="metrics-filter-panel" labelledBy="metrics-filter-toggle" open={showFilters} className="grid grid-cols-2 gap-2 text-xs">
          <label>P/E máx<input className="ui-input mt-1" inputMode="decimal" value={filters.peMax} onChange={(e) => setFilters({ ...filters, peMax: e.target.value })} /></label>
          <label>PEG máx<input className="ui-input mt-1" inputMode="decimal" value={filters.pegMax} onChange={(e) => setFilters({ ...filters, pegMax: e.target.value })} /></label>
          <label>P/B máx<input className="ui-input mt-1" inputMode="decimal" value={filters.pbMax} onChange={(e) => setFilters({ ...filters, pbMax: e.target.value })} /></label>
          <label>ROE mín<input className="ui-input mt-1" inputMode="decimal" value={filters.roeMin} onChange={(e) => setFilters({ ...filters, roeMin: e.target.value })} /></label>
        </CollapsiblePanel>
        <ScrollableChips
          label="Tipo de instrumento"
          options={(["all", "stock", "etf"] as const).map((item) => ({ value: item, label: item === "all" ? "Todos" : item === "stock" ? "Acciones" : "ETF" }))}
          value={filters.type}
          onChange={(type) => setFilters({ ...filters, type })}
        />
        <button type="button" className="ui-btn ui-btn-primary w-full" disabled={loading} aria-busy={loading} onClick={() => void run()}>
          {loading ? "Filtrando…" : "Filtrar"}
        </button>
        {error ? <p className="text-danger text-sm" role="alert">{error}</p> : null}
        {results.map((r) => (
          <Link key={r.symbol} href={`/asset/${encodeURIComponent(r.symbol)}`} className="block bg-card border border-border rounded-xl p-3">
            <p className="font-semibold text-sm">{r.symbol} · {r.name}</p>
            <p className="text-xs text-muted">P/E {fmt(r.pe)} · PEG {fmt(r.peg)} · P/B {fmt(r.pb)} · ROE {fmt(r.roe)} · yield {fmt(r.divYieldPct)}</p>
          </Link>
        ))}
      </main>
    </div>
  );
}
