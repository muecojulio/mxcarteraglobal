"use client";

import { useState, useEffect, useCallback } from "react";
import { useUsdMxn, toMxn, formatMxn } from "@/lib/fx";

type Row = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  region: string;
  currency: string;
  source?: string;
};

function formatPercent(n: number) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function formatVol(n?: number) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function ScreenerPage() {
  const { fx } = useUsdMxn(120_000);
  const usdMxn = fx?.usdMxn ?? null;
  const [region, setRegion] = useState<"ALL" | "US" | "MX">("ALL");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [results, setResults] = useState<Row[]>([]);
  const [source, setSource] = useState("");
  // `loading`/`error` derivados de qué petición terminó (ver calendar).
  const [settled, setSettled] = useState<{ key: string; error: string | null } | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const requestKey = `${region}|${minPrice}|${maxPrice}|${usdMxn}|${reloadNonce}`;
  const isCurrent = settled?.key === requestKey;
  const loading = !isCurrent;
  const error = isCurrent ? settled?.error ?? null : null;

  const load = useCallback(() => setReloadNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const params = new URLSearchParams({
          preset: "losers",
          region,
        });
        // Filtros de precio se capturan en MXN; para US se envía equivalente USD
        const rate = usdMxn && usdMxn > 0 ? usdMxn : 17.5;
        if (minPrice) {
          const n = Number(minPrice);
          if (Number.isFinite(n)) {
            params.set("minPrice", String(region === "MX" ? n : n / rate));
          }
        }
        if (maxPrice) {
          const n = Number(maxPrice);
          if (Number.isFinite(n)) {
            params.set("maxPrice", String(region === "MX" ? n : n / rate));
          }
        }

        const res = await fetch(`/api/screener?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const rows = (data.results || []).filter(
          (r: Row) => r.changePercent < 0
        );
        setResults(rows);
        setSource(data.source || "");
        setSettled({
          key: requestKey,
          error: typeof data.error === "string" ? data.error : null,
        });
      } catch (err) {
        if (cancelled) return;
        setResults([]);
        setSettled({
          key: requestKey,
          error: err instanceof Error ? err.message : "Error",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [region, minPrice, maxPrice, usdMxn, requestKey]);

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border safe-top">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Filtro</h1>
            {source && (
              <span className="text-[10px] font-medium bg-success/15 text-success px-2 py-0.5 rounded-full">
                {source === "fmp" ? "FMP" : "EN VIVO"}
              </span>
            )}
          </div>
          <button
            onClick={() => load()}
            className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted text-sm active:scale-95"
            aria-label="Actualizar"
          >
            ↻
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full">

        {/* Solo bajas */}
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs text-muted">Mostrando solo <span className="font-medium text-foreground">bajas</span> del día (sin alzas).</p>
        </div>

        {/* Región */}
        <div className="px-4 pb-2 flex gap-2">
          {(
            [
              { key: "ALL", label: "Todos" },
              { key: "US", label: "🇺🇸 EE.UU." },
              { key: "MX", label: "🇲🇽 México" },
            ] as const
          ).map((r) => (
            <button
              key={r.key}
              onClick={() => setRegion(r.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                region === r.key
                  ? "bg-secondary text-foreground"
                  : "text-muted"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Filtros numéricos */}
        <div className="px-4 pb-3">
          <div className="bg-card rounded-xl border border-border p-3 space-y-3">
            <p className="text-xs font-medium text-muted">Filtros</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted">Precio mín (MXN)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="ej. 10"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full mt-0.5 bg-background border border-border rounded-lg py-2 px-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted">Precio máx (MXN)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="ej. 500"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full mt-0.5 bg-background border border-border rounded-lg py-2 px-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
            <button
              onClick={() => load()}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:scale-[0.98] transition-transform"
            >
              Aplicar filtros
            </button>
          </div>
        </div>

        {/* Resultados */}
        <div className="px-4 pb-8">
          <p className="text-xs text-muted mb-2 px-1">
            {loading ? "Cargando…" : `${results.length} resultados`}
          </p>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-14 bg-card rounded-xl border border-border animate-pulse"
                />
              ))}
            </div>
          ) : error && results.length === 0 ? (
            <p className="text-center text-danger py-10 text-sm">{error}</p>
          ) : results.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🔎</p>
              <p className="font-medium">Sin resultados</p>
              <p className="text-sm text-muted mt-1">
                Ajusta los filtros o el preset
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
              {results.map((r) => (
                <div
                  key={r.symbol}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                        r.region === "MX"
                          ? "bg-green-500/15 text-green-600"
                          : "bg-blue-500/15 text-blue-600"
                      }`}
                    >
                      {r.region === "MX" ? "MX" : "US"}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{r.symbol}</p>
                      <p className="text-xs text-muted truncate max-w-[140px]">
                        {r.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-sm">
                      {formatMxn(
                        toMxn(
                          r.price,
                          r.currency || (r.region === "MX" ? "MXN" : "USD"),
                          usdMxn
                        )
                      )}
                    </p>
                    <p
                      className={`text-xs font-medium ${
                        r.changePercent >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {formatPercent(r.changePercent)}
                    </p>
                    {r.volume != null && (
                      <p className="text-[10px] text-muted">
                        Vol {formatVol(r.volume)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-[11px] text-muted text-center mt-6 leading-relaxed">
            Solo bajas del día. Precios en pesos mexicanos. No es recomendación
            de inversión.
          </p>
        </div>
      </main>
    </div>
  );
}
