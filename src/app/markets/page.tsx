"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Quote, IndexQuote } from "@/lib/market-data/types";
import { useQuotes } from "@/lib/market-data/client";
import { useUsdMxn, toMxn, formatMxn } from "@/lib/fx";

type Mover = { symbol: string; price: number; changePercent: number };

const BONDS = [
  { symbol: "LQD", name: "Corp. grado inversión · SIC" },
  { symbol: "VCIT", name: "Corp. intermedio Vanguard · SIC" },
  { symbol: "VCSH", name: "Corp. corto Vanguard · SIC" },
  { symbol: "HYG", name: "Alto rendimiento iShares · SIC" },
  { symbol: "JNK", name: "Alto rendimiento SPDR · SIC" },
  { symbol: "USHY", name: "Alto rendimiento amplio · SIC" },
  { symbol: "VCLT", name: "Corp. largo plazo Vanguard · SIC" },
  { symbol: "USIG", name: "Corp. grado inversión amplio · SIC" },
  { symbol: "SPIB", name: "Corp. intermedio SPDR · SIC" },
  { symbol: "IGIB", name: "Corp. intermedio iShares · SIC" },
  { symbol: "IGSB", name: "Corp. corto iShares 1-5 años · SIC" },
  { symbol: "SPSB", name: "Corp. corto SPDR · SIC" },
  { symbol: "SLQD", name: "Corp. 0-5 años iShares · SIC" },
  { symbol: "VTC", name: "Corp. total Vanguard · SIC" },
  { symbol: "IGLB", name: "Corp. largo iShares 10+ años · SIC" },
  { symbol: "CORP", name: "Corp. PIMCO grado inversión · SIC" },
  { symbol: "BND", name: "Vanguard Total Bond · SIC" },
  { symbol: "AGG", name: "iShares Aggregate Bond · SIC" },
  { symbol: "TIP", name: "iShares TIPS · SIC" },
  { symbol: "EMB", name: "Bonos emergentes · SIC" },
];

const COMMODITIES = [
  { symbol: "GLD", name: "Oro (GLD) · SIC" },
  { symbol: "SLV", name: "Plata (SLV) · SIC" },
  { symbol: "USO", name: "Petróleo (USO) · SIC" },
  { symbol: "UNG", name: "Gas natural (UNG) · SIC" },
  { symbol: "DBC", name: "Materias primas amplias · SIC" },
  { symbol: "GSG", name: "Materias primas iShares · SIC" },
];

function formatPercent(n: number) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

/**
 * Zona de cada índice. Constante de módulo: antes se declaraba dentro del
 * componente, así que el `useMemo` de `filteredIndices` la leía sin poder
 * declararla como dependencia (y se recreaba en cada render).
 */
const INDEX_ZONE: Record<string, "US" | "MX" | "EU" | "ASIA"> = {
  "^GSPC": "US",
  "^DJI": "US",
  "^IXIC": "US",
  "^RUT": "US",
  "^MXX": "MX",
  "^FTSE": "EU",
  "^GDAXI": "EU",
  "^FCHI": "EU",
  "^STOXX50E": "EU",
  "^N225": "ASIA",
  "^HSI": "ASIA",
  "000001.SS": "ASIA",
};

function MarketsInner() {
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") || "markets").toLowerCase();
  const [region, setRegion] = useState<"US" | "MX" | "EU" | "ASIA">("US");
  const [indices, setIndices] = useState<IndexQuote[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [movers, setMovers] = useState<{
    gainers: Mover[];
    losers: Mover[];
  } | null>(null);
  // `loading`/`error` derivados de qué petición terminó (ver calendar).
  const [settled, setSettled] = useState<{ key: string; error: string | null } | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const { fx } = useUsdMxn(120_000);
  const usdMxn = fx?.usdMxn ?? null;

  const bondSymbols = useMemo(() => BONDS.map((b) => b.symbol), []);
  const commoditySymbols = useMemo(() => COMMODITIES.map((c) => c.symbol), []);

  const { data: bondData, loading: bondLoading } = useQuotes(
    tab === "bonds" ? bondSymbols : [],
    60_000
  );
  const { data: commodityData, loading: commodityLoading } = useQuotes(
    tab === "commodities" ? commoditySymbols : [],
    60_000
  );

  const skipFetch = tab === "bonds" || tab === "commodities";
  const requestKey = `${region}|${tab}|${reloadNonce}`;
  const isCurrent = settled?.key === requestKey;
  // En las pestañas de bonos/commodities los datos vienen de useQuotes, no de
  // /api/markets, así que ahí no hay carga propia.
  const loading = !skipFetch && !isCurrent;
  const error = isCurrent ? settled?.error ?? null : null;

  const load = useCallback(() => setReloadNonce((n) => n + 1), []);

  useEffect(() => {
    if (skipFetch) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/markets?region=${region}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setIndices(data.indices || []);
        setQuotes(data.quotes || []);
        setMovers(data.movers || null);
        setSettled({ key: requestKey, error: null });
      } catch (err) {
        if (cancelled) return;
        setSettled({
          key: requestKey,
          error: err instanceof Error ? err.message : "Error",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [region, skipFetch, requestKey]);

  const title =
    tab === "bonds"
      ? "Bonos"
      : tab === "commodities"
      ? "Materias primas"
      : tab === "indices"
      ? "Índices"
      : "Mercados";

  const priceOf = (q: { price: number; currency?: string; region?: string }) =>
    formatMxn(
      toMxn(q.price, q.currency || (q.region === "MX" ? "MXN" : "USD"), usdMxn)
    );

  const filteredIndices = useMemo(() => {
    // En pestaña "Índices" se muestran todos; en Mercados, solo la región elegida
    if (tab === "indices") return indices;
    return indices.filter((idx) => {
      const z =
        (idx as IndexQuote & { zone?: string }).zone ||
        INDEX_ZONE[idx.symbol] ||
        (idx.region === "MX" ? "MX" : idx.region === "US" ? "US" : null);
      if (!z) return region === "US";
      return z === region;
    });
  }, [indices, region, tab]);

  const renderQuoteList = (
    rows: Array<{ symbol: string; name: string }>,
    quoteMap: Map<string, Quote>,
    isLoading: boolean
  ) => {
    if (isLoading) {
      return (
        <div className="space-y-2 px-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-card rounded-xl animate-pulse" />
          ))}
        </div>
      );
    }
    return (
      <div className="px-4 pb-8">
        <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
          {rows.map((row) => {
            const q = quoteMap.get(row.symbol.toUpperCase());
            return (
              <Link
                key={row.symbol}
                href={`/asset/${encodeURIComponent(row.symbol)}`}
                className="flex items-center justify-between px-4 py-3.5 min-h-[56px]"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{row.symbol}</p>
                  <p className="text-xs text-muted truncate">{row.name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-sm">
                    {q ? priceOf(q) : "—"}
                  </p>
                  {q && (
                    <p
                      className={`text-xs font-medium ${
                        q.changePercent >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {formatPercent(q.changePercent)}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
        <p className="text-[11px] text-muted text-center mt-4 px-2">
          Precios en pesos mexicanos. Datos de mercado referenciales.
        </p>
      </div>
    );
  };

  const bondMap = useMemo(() => {
    const m = new Map<string, Quote>();
    (bondData?.quotes || []).forEach((q) => m.set(q.symbol.toUpperCase(), q));
    return m;
  }, [bondData]);

  const commodityMap = useMemo(() => {
    const m = new Map<string, Quote>();
    (commodityData?.quotes || []).forEach((q) =>
      m.set(q.symbol.toUpperCase(), q)
    );
    return m;
  }, [commodityData]);

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border safe-top">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <h1 className="text-lg font-bold">{title}</h1>
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
        {tab === "bonds" &&
          renderQuoteList(BONDS, bondMap, bondLoading && !bondData)}

        {tab === "commodities" &&
          renderQuoteList(
            COMMODITIES,
            commodityMap,
            commodityLoading && !commodityData
          )}

        {tab === "indices" && (
          <div className="px-4 pb-8 pt-4">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />
                ))}
              </div>
            ) : indices.length === 0 ? (
              <p className="text-center text-muted py-10 text-sm">
                No se pudieron cargar índices
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredIndices.map((idx) => (
                  <div
                    key={idx.symbol}
                    className="bg-card rounded-xl border border-border p-3"
                  >
                    <p className="text-xs text-muted truncate">{idx.name}</p>
                    <p className="font-bold text-sm mt-0.5">
                      {formatMxn(toMxn(idx.price, "USD", usdMxn))}
                    </p>
                    <p
                      className={`text-xs font-medium ${
                        idx.changePercent >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {formatPercent(idx.changePercent)}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted text-center mt-4">
              Valores convertidos a MXN solo como referencia (los índices se
              cotizan en puntos / USD).
            </p>
          </div>
        )}

        {(tab === "markets" || tab === "") && (
          <>
            <div className="px-4 pt-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
              {(
                [
                  { key: "US", label: "🇺🇸 EE.UU." },
                  { key: "MX", label: "🇲🇽 México" },
                  { key: "EU", label: "🇪🇺 Europa" },
                  { key: "ASIA", label: "🌏 Asia" },
                ] as const
              ).map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRegion(r.key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                    region === r.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-muted"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="px-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <p className="text-center text-danger py-10 text-sm px-4">{error}</p>
            ) : (
              <div className="px-4 pb-8 space-y-6">
                <section>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">
                        Índices{" "}
                        {region === "US" && "EE.UU."}
                        {region === "MX" && "México"}
                        {region === "EU" && "Europa"}
                        {region === "ASIA" && "Asia"}
                      </h2>
                      <Link
                        href="/markets?tab=indices"
                        className="text-xs text-primary font-medium"
                      >
                        Ver todos
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {filteredIndices.slice(0, 6).map((idx) => (
                        <div
                          key={idx.symbol}
                          className="bg-card rounded-xl border border-border p-3"
                        >
                          <p className="text-xs text-muted truncate">
                            {idx.name}
                          </p>
                          <p className="font-bold text-sm mt-0.5">
                            {idx.price.toLocaleString("es-MX", {
                              maximumFractionDigits: 2,
                            })}
                          </p>
                          <p
                            className={`text-xs font-medium ${
                              idx.changePercent >= 0
                                ? "text-success"
                                : "text-danger"
                            }`}
                          >
                            {formatPercent(idx.changePercent)}
                          </p>
                        </div>
                      ))}
                    </div>
                    {filteredIndices.length === 0 && (
                      <p className="text-xs text-muted text-center py-4">
                        No hay índices para esta región en este momento.
                      </p>
                    )}
                  </section>

                <section>
                  <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
                    {region === "US" && "Principales EE.UU."}
                    {region === "MX" && "Principales México"}
                    {region === "EU" && "Principales Europa"}
                    {region === "ASIA" && "Principales Asia"}
                  </h2>
                  <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
                    {quotes.map((q) => (
                      <Link
                        key={q.symbol}
                        href={`/asset/${encodeURIComponent(q.symbol)}`}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-sm">{q.symbol}</p>
                          <p className="text-xs text-muted truncate max-w-[160px]">
                            {q.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{priceOf(q)}</p>
                          <p
                            className={`text-xs font-medium ${
                              q.changePercent >= 0
                                ? "text-success"
                                : "text-danger"
                            }`}
                          >
                            {formatPercent(q.changePercent)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>

                {region === "MX" && movers && (
                  <section className="space-y-3">
                    <h2 className="text-xs font-semibold text-muted uppercase tracking-wide px-1">
                      Mayores bajas BMV
                    </h2>
                    <div className="bg-card rounded-xl border border-border divide-y divide-border">
                      {movers.losers.map((m) => (
                        <div
                          key={m.symbol}
                          className="flex justify-between px-4 py-2.5"
                        >
                          <p className="font-semibold text-sm">{m.symbol}</p>
                          <p className="text-xs font-medium text-danger">
                            {formatPercent(m.changePercent)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function MarketsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-muted text-sm">Cargando…</div>
      }
    >
      <MarketsInner />
    </Suspense>
  );
}
