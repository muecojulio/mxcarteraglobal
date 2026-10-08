"use client";

import { useState, useCallback, useEffect } from "react";
import { CollapsiblePanel } from "@/components/ui/CollapsiblePanel";
import { HorizontalRail } from "@/components/ui/HorizontalRail";
import Link from "next/link";

type Row = {
  symbol: string;
  name: string;
  type: "stock" | "etf";
  region: "US" | "MX" | "GLOBAL";
  currency: string;
  price: number | null;
  priceMxn: number | null;
  pe: number | null;
  peg: number | null;
  pb: number | null;
  ps: number | null;
  roe: number | null;
  roa: number | null;
  roi: number | null;
  revGrowth: number | null;
  epsGrowth: number | null;
  divYieldPct: number | null;
  dividendFrequency: string | null;
  undervalued: boolean | null;
};

type Filters = {
  type: "all" | "stock" | "etf";
  peMax: string;
  pegMax: string;
  pbMax: string;
  psMax: string;
  roeMin: string;
  roaMin: string;
  roiMin: string;
  revGrowthMin: string;
  epsGrowthMin: string;
  undervalued: boolean;
};

const DEFAULT: Filters = {
  type: "all",
  peMax: "15",
  pegMax: "1",
  pbMax: "1.5",
  psMax: "2",
  roeMin: "10",
  roaMin: "10",
  roiMin: "10",
  revGrowthMin: "10",
  epsGrowthMin: "10",
  undervalued: false,
};

function fmt(n: number | null, d = 2) {
  if (n == null) return "—";
  return n.toLocaleString("es-MX", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

export default function MetricsPage() {
  const [filters, setFilters] = useState<Filters>(DEFAULT);
  const [results, setResults] = useState<Row[]>([]);
  const [usdMxn, setUsdMxn] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [showFilters, setShowFilters] = useState(true);

  const buildQuery = useCallback((f: Filters, preset?: string) => {
    const p = new URLSearchParams();
    if (preset) p.set("preset", preset);
    p.set("type", f.type);
    if (f.peMax) p.set("peMax", f.peMax);
    if (f.pegMax) p.set("pegMax", f.pegMax);
    if (f.pbMax) p.set("pbMax", f.pbMax);
    if (f.psMax) p.set("psMax", f.psMax);
    if (f.roeMin) p.set("roeMin", f.roeMin);
    if (f.roaMin) p.set("roaMin", f.roaMin);
    if (f.roiMin) p.set("roiMin", f.roiMin);
    if (f.revGrowthMin) p.set("revGrowthMin", f.revGrowthMin);
    if (f.epsGrowthMin) p.set("epsGrowthMin", f.epsGrowthMin);
    if (f.undervalued) p.set("undervalued", "1");
    return p.toString();
  }, []);

  const run = useCallback(
    async (preset?: string, f = filters) => {
      setLoading(true);
      setError(null);
      try {
        // Sin filtros estrictos al inicio: pedir type only o preset
        let qs = "";
        if (preset === "all") {
          qs = `type=${f.type}`;
        } else if (preset) {
          qs = buildQuery(f, preset);
        } else {
          qs = buildQuery(f);
        }
        const res = await fetch(`/api/metrics?${qs}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setResults(data.results || []);
        setUsdMxn(data.usdMxn ?? null);
        setNote(data.note || "");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [filters, buildQuery]
  );

  useEffect(() => {
    // Carga inicial sin filtros agresivos (todos del universo)
    run("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (key: keyof Filters, value: string | boolean) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border safe-top">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <h1 className="text-lg font-bold">Métricas</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="metrics-filter-toggle"
              aria-expanded={showFilters}
              aria-controls="metrics-filters"
              onClick={() => setShowFilters((s) => !s)}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border"
            >
              Filtros
            </button>
            <button
              type="button"
              onClick={() => run()}
              disabled={loading}
              aria-busy={loading}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
            >
              {loading ? "…" : "Aplicar"}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 pb-10 pt-3 space-y-4">
        <p className="text-[11px] text-muted leading-relaxed">
          Yahoo Finance público primero; Finnhub/FMP/Alpha Vantage y DataBursatil
          completan huecos si configuraste sus variables. Los precios en{" "}
          <strong className="text-foreground">USD</strong> se muestran también en MXN
          {usdMxn != null && ` · TC ${usdMxn.toFixed(2)}`}. Sin forex/cripto como activos.
          No es recomendación de inversión.
        </p>

        {/* Presets */}
        <HorizontalRail ariaLabel="Criterios predefinidos">
          {[
            { id: "all", label: "Ver todos" },
            { id: "value", label: "Valor" },
            { id: "quality", label: "Calidad+crecimiento" },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => run(p.id)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-card border border-border"
            >
              {p.label}
            </button>
          ))}
        </HorizontalRail>

        {/* Tipo */}
        <div className="flex gap-2">
          {(
            [
              ["all", "Todos"],
              ["stock", "Acciones"],
              ["etf", "ETFS"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={filters.type === k}
              onClick={() => {
                set("type", k);
                setFilters((prev) => {
                  const next = { ...prev, type: k };
                  return next;
                });
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-medium border ${
                filters.type === k
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <CollapsiblePanel id="metrics-filters" labelledBy="metrics-filter-toggle" open={showFilters}>
          <section className="bg-card rounded-xl border border-border p-4 space-y-3">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide">
              Criterios (vacío = no filtrar)
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["peMax", "PER máx (ej. 10–15)"],
                  ["pegMax", "PEG máx (≤1)"],
                  ["pbMax", "P/B máx (≤1.5)"],
                  ["psMax", "P/S máx (≤2)"],
                  ["roeMin", "ROE mín % (≥10)"],
                  ["roaMin", "ROA mín % (≥10)"],
                  ["roiMin", "ROI mín % (≥10)"],
                  ["revGrowthMin", "Ing. crec. % (≥10)"],
                  ["epsGrowthMin", "Gan. crec. % (≥10)"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label htmlFor={`metric-${key}`} className="text-[10px] text-muted block mb-1">
                    {label}
                  </label>
                  <input
                    id={`metric-${key}`}
                    type="number"
                    step="0.1"
                    value={filters[key]}
                    onChange={(e) => set(key, e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm"
                    placeholder="—"
                  />
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.undervalued}
                onChange={(e) => set("undervalued", e.target.checked)}
                className="rounded"
              />
              Solo posibles infravaloradas
            </label>
            <button
              type="button"
              onClick={() => {
                setFilters(DEFAULT);
              }}
              className="text-xs text-primary font-medium"
            >
              Restaurar valores sugeridos
            </button>
          </section>
        </CollapsiblePanel>

        {error && (
          <p className="text-sm text-danger text-center">{error}</p>
        )}

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 bg-card rounded-xl border border-border animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && (
          <p className="text-xs text-muted">
            {results.length} resultado{results.length === 1 ? "" : "s"}
          </p>
        )}

        <div className="space-y-2">
          {results.map((r) => (
            <Link
              key={r.symbol}
              href={`/asset/${encodeURIComponent(r.symbol)}`}
              className="block bg-card rounded-xl border border-border p-3 active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm">{r.symbol}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted">
                      {r.type === "etf" ? "ETF" : "Acción"}
                    </span>
                    {r.undervalued && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/15 text-success">
                        Infraval.
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted truncate">{r.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm">
                    {r.priceMxn != null
                      ? `$${fmt(r.priceMxn, 2)}`
                      : "—"}
                  </p>
                  <p className="text-[10px] text-muted">MXN</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1 mt-2 text-center">
                <div>
                  <p className="text-xs font-medium">{fmt(r.pe, 1)}</p>
                  <p className="text-[9px] text-muted">PER</p>
                </div>
                <div>
                  <p className="text-xs font-medium">{fmt(r.peg, 2)}</p>
                  <p className="text-[9px] text-muted">PEG</p>
                </div>
                <div>
                  <p className="text-xs font-medium">{fmt(r.pb, 2)}</p>
                  <p className="text-[9px] text-muted">P/B</p>
                </div>
                <div>
                  <p className="text-xs font-medium">{fmt(r.ps, 2)}</p>
                  <p className="text-[9px] text-muted">P/S</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1 mt-1.5 text-center">
                <div>
                  <p className="text-xs font-medium">
                    {r.roe != null ? `${fmt(r.roe, 0)}%` : "—"}
                  </p>
                  <p className="text-[9px] text-muted">ROE</p>
                </div>
                <div>
                  <p className="text-xs font-medium">
                    {r.roa != null ? `${fmt(r.roa, 0)}%` : "—"}
                  </p>
                  <p className="text-[9px] text-muted">ROA</p>
                </div>
                <div>
                  <p className="text-xs font-medium">
                    {r.roi != null ? `${fmt(r.roi, 0)}%` : "—"}
                  </p>
                  <p className="text-[9px] text-muted">ROI</p>
                </div>
                <div>
                  <p className="text-xs font-medium">
                    {r.divYieldPct != null
                      ? `${fmt(r.divYieldPct, 2)}%`
                      : "—"}
                  </p>
                  <p className="text-[9px] text-muted">Rend. dividendo</p>
                </div>
              </div>
              <div className="flex justify-between mt-1.5 text-[10px] text-muted">
                <span>
                  Ing. {r.revGrowth != null ? `${fmt(r.revGrowth, 1)}%` : "—"} ·
                  Gan. {r.epsGrowth != null ? `${fmt(r.epsGrowth, 1)}%` : "—"}
                </span>
                <span>{r.dividendFrequency || "—"}</span>
              </div>
            </Link>
          ))}
        </div>

        {!loading && results.length === 0 && (
          <p className="text-center text-sm text-muted py-8">
            Ningún título cumple los filtros. Prueba “Ver todos” o relaja PER /
            ROE.
          </p>
        )}

        {note && (
          <p className="text-[10px] text-muted text-center leading-relaxed">
            {note}
          </p>
        )}
      </main>
    </div>
  );
}
