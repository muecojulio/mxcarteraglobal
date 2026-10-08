"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useQuotes } from "@/lib/market-data/client";
import { loadPositions, savePositions, loadWatchlist, loadPrefs, savePrefs, type Position } from "@/lib/persist";
import { LiveBadge } from "@/components/LiveBadge";
import type { Quote } from "@/lib/market-data/types";
import { useUsdMxn, toDisplay } from "@/lib/fx";
import { PortfolioEvents } from "@/components/PortfolioEvents";
import { RebalanceSuggestions } from "@/components/RebalanceSuggestions";
import { TaxEstimator } from "@/components/TaxEstimator";
import { PortfolioBackup } from "@/components/PortfolioBackup";
import { useToast } from "@/components/Toast";
import {
  useHydratedState,
  useMounted,
  localStorageIdentity,
} from "@/lib/use-hydrated-value";

/** Constantes de módulo: useSyncExternalStore exige snapshots estables. */
const EMPTY_POSITIONS: Position[] = [];
const EMPTY_POINTS: Array<{ t: number; value: number }> = [];

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency === "MXN" ? "MXN" : "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}


export default function PortfolioPage() {
  const toast = useToast();
  // Posiciones y moneda se hidratan durante el render y siguen siendo editables
  // (antes: effect con cuatro setState síncronos).
  const [positions, setPositions] = useHydratedState<Position[]>(
    localStorageIdentity("marketpulse_positions"),
    loadPositions,
    EMPTY_POSITIONS
  );
  const hydrated = useMounted();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "MX" | "US">("ALL");
  const [displayCurrency, setDisplayCurrency] = useHydratedState<"USD" | "MXN">(
    localStorageIdentity("mxcg_prefs"),
    () => loadPrefs().displayCurrency ?? "MXN",
    "MXN"
  );
  const { fx, loading: fxLoading } = useUsdMxn();
  const [chartRange, setChartRange] = useState("1s");
  const [chartPointsRaw, setChartPointsRaw] = useState<
    Array<{ t: number; value: number }>
  >([]);
  const [periodChange, setPeriodChange] = useState<number | null>(null);
  const [periodChangePct, setPeriodChangePct] = useState<number | null>(null);
  // `chartLoading` se deriva de qué petición de histórico terminó, en vez de
  // setearse en síncrono dentro del effect. Sin posiciones no hay gráfico.
  const [chartSettledFor, setChartSettledFor] = useState<string | null>(null);
  const holdingsKey = positions
    .map((p) => `${p.symbol}:${p.quantity}`)
    .join(",");
  const chartKey = `${holdingsKey}|${chartRange}|${displayCurrency}`;
  const chartLoading = holdingsKey !== "" && chartSettledFor !== chartKey;
  const chartPoints = holdingsKey === "" ? EMPTY_POINTS : chartPointsRaw;
  const [form, setForm] = useState({
    symbol: "",
    name: "",
    quantity: "",
    avgCost: "",
    region: "US" as "MX" | "US",
  });


  useEffect(() => {
    if (!hydrated) return;
    savePositions(positions);
  }, [positions, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    savePrefs({ displayCurrency });
  }, [displayCurrency, hydrated]);

  const symbols = useMemo(
    () => positions.map((p) => p.symbol),
    [positions]
  );

  const eventSymbols = useMemo(() => {
    const wl = loadWatchlist();
    const set = new Set<string>([
      ...positions.map((p) => p.symbol.toUpperCase()),
      ...wl.map((s) => s.toUpperCase()),
    ]);
    return Array.from(set);
  }, [positions]);

  const { data, loading, liveStatus, refresh } = useQuotes(symbols, 45_000);
  const quotesMap = useMemo(() => {
    const map = new Map<string, Quote>();
    (data?.quotes ?? []).forEach((q) => map.set(q.symbol.toUpperCase(), q));
    return map;
  }, [data]);

  const usingReal = data?.usingRealData ?? false;

  const calculated = useMemo(() => {
    return positions.map((p) => {
      const live = quotesMap.get(p.symbol.toUpperCase());
      const currentPrice = live?.price ?? p.avgCost; // fallback to cost if no quote
      const marketValue = p.quantity * currentPrice;
      const costBasis = p.quantity * p.avgCost;
      const pl = marketValue - costBasis;
      const plPercent = costBasis > 0 ? (pl / costBasis) * 100 : 0;
      return {
        ...p,
        name: live?.name || p.name,
        currentPrice,
        marketValue,
        costBasis,
        pl,
        plPercent,
        hasLivePrice: Boolean(live),
      };
    });
  }, [positions, quotesMap]);

  const filtered = calculated.filter((p) => {
    if (filter === "MX") return p.region === "MX";
    if (filter === "US") return p.region === "US";
    return true;
  });

  const usdMxn = fx?.usdMxn ?? 17.0;

  const summary = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    let totalPL = 0;

    calculated.forEach((p) => {
      const cur = (p.currency === "MXN" ? "MXN" : "USD") as "USD" | "MXN";
      totalValue += toDisplay(p.marketValue, cur, displayCurrency, usdMxn);
      totalCost += toDisplay(p.costBasis, cur, displayCurrency, usdMxn);
      totalPL += toDisplay(p.pl, cur, displayCurrency, usdMxn);
    });

    const totalPLPercent =
      totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalPL,
      totalPLPercent,
      positionsCount: positions.length,
    };
  }, [calculated, positions.length, displayCurrency, usdMxn]);

  const dayChange = useMemo(() => {
    let d = 0;
    calculated.forEach((p) => {
      // approximate day change: changePercent of current value
      const live = quotesMap.get(p.symbol.toUpperCase());
      if (!live) return;
      const cur = (p.currency === "MXN" ? "MXN" : "USD") as "USD" | "MXN";
      const mv = toDisplay(p.marketValue, cur, displayCurrency, usdMxn);
      const chgPct = live.changePercent ?? 0;
      d += mv * (chgPct / 100);
    });
    return d;
  }, [calculated, quotesMap, displayCurrency, usdMxn]);

  const dayChangePct = useMemo(() => {
    if (!summary.totalValue) return 0;
    return (dayChange / summary.totalValue) * 100;
  }, [dayChange, summary.totalValue]);


  const removePosition = (id: string) => {
    const pos = positions.find((x) => x.id === id);
    setPositions((prev) => prev.filter((p) => p.id !== id));
    toast(pos ? `Eliminado: ${pos.symbol}` : "Posición eliminada");
  };

  const handleAdd = () => {
    if (!form.symbol.trim() || !form.quantity || !form.avgCost) return;

    const newPos: Position = {
      id: Date.now().toString(),
      symbol: form.symbol.trim().toUpperCase(),
      name: form.name.trim() || form.symbol.trim().toUpperCase(),
      quantity: parseFloat(form.quantity),
      avgCost: parseFloat(form.avgCost),
      region: form.region,
      market: form.region === "MX" ? "BMV" : "NASDAQ",
      currency: form.region === "MX" ? "MXN" : "USD",
    };

    setPositions((prev) => [...prev, newPos]);
    setForm({
      symbol: "",
      name: "",
      quantity: "",
      avgCost: "",
      region: "US",
    });
    setShowAdd(false);
    toast(`Posición añadida: ${form.symbol.trim().toUpperCase()}`);
  };

  useEffect(() => {
    if (!positions.length) return;
    let cancelled = false;
    void (async () => {
      try {
        const holdings = positions
          .map((p) => `${p.symbol}:${p.quantity}`)
          .join(",");
        const res = await fetch(
          `/api/portfolio-history?holdings=${encodeURIComponent(
            holdings
          )}&range=${chartRange}&display=${displayCurrency}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setChartPointsRaw(data.points || []);
        setPeriodChange(
          data.periodChange != null ? Number(data.periodChange) : null
        );
        setPeriodChangePct(
          data.periodChangePercent != null
            ? Number(data.periodChangePercent)
            : null
        );
      } catch {
        /* */
      } finally {
        if (!cancelled) setChartSettledFor(chartKey);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [positions, chartRange, displayCurrency, chartKey]);

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border safe-top">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Mi Cartera</h1>
            {usingReal && (
              <span className="text-[10px] font-medium bg-success/15 text-success px-2 py-0.5 rounded-full">
                EN VIVO
              </span>
            )}
            <LiveBadge status={liveStatus} />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setDisplayCurrency((c) => (c === "MXN" ? "USD" : "MXN"))
              }
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border"
              title="Cambiar moneda de visualización"
            >
              {displayCurrency}
            </button>
            <Link
              href="/portfolio/analysis"
              className="text-xs font-medium text-primary px-2.5 py-1.5 rounded-lg border border-border"
            >
              Análisis
            </Link>
            <button
              onClick={() => refresh()}
              className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted text-sm active:scale-95"
              aria-label="Actualizar"
            >
              ↻
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-medium active:scale-95 transition-transform"
              aria-label="Añadir posición"
            >
              +
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full">
                {/* Resumen estilo Portafolio */}
        <section className="px-4 pt-5 pb-2">
          <p className="text-[11px] text-muted uppercase tracking-wider text-center mb-1">
            Valor de mercado
          </p>
          <p className="text-3xl font-bold tracking-tight text-center">
            {loading
              ? "…"
              : formatMoney(summary.totalValue, displayCurrency)}
          </p>
          <p
            className={`text-center text-sm font-medium mt-1.5 ${
              dayChange >= 0 ? "text-success" : "text-danger"
            }`}
          >
            {dayChange >= 0 ? "↑" : "↓"}
            {formatMoney(Math.abs(dayChange), displayCurrency)}{" "}
            {formatPercent(dayChangePct)}
            <span className="text-muted font-normal text-xs"> hoy</span>
          </p>
          <p className="text-center text-sm mt-1">
            <span className="text-muted">P/G abierto </span>
            <span
              className={`font-semibold ${
                summary.totalPL >= 0 ? "text-success" : "text-danger"
              }`}
            >
              {summary.totalPL >= 0 ? "↑" : "↓"}
              {formatMoney(Math.abs(summary.totalPL), displayCurrency)}{" "}
              {formatPercent(summary.totalPLPercent)}
            </span>
          </p>

          {/* Gráfico histórico del portafolio */}
          <div className="mt-4 h-40 relative">
            {chartLoading && (
              <p className="absolute inset-0 flex items-center justify-center text-xs text-muted">
                Cargando gráfico…
              </p>
            )}
            {!chartLoading && chartPoints.length > 1 && (
              <svg
                viewBox="0 0 320 120"
                className="w-full h-full"
                preserveAspectRatio="none"
              >
                {(() => {
                  const vals = chartPoints.map((p) => p.value);
                  const min = Math.min(...vals);
                  const max = Math.max(...vals);
                  const span = max - min || 1;
                  const up =
                    (periodChange ?? 0) >= 0 ||
                    vals[vals.length - 1] >= vals[0];
                  const color = up ? "#22c55e" : "#ef4444";
                  const pts = chartPoints
                    .map((p, i) => {
                      const x =
                        (i / (chartPoints.length - 1)) * 320;
                      const y = 110 - ((p.value - min) / span) * 100;
                      return `${x},${y}`;
                    })
                    .join(" ");
                  const area =
                    `0,120 ` +
                    chartPoints
                      .map((p, i) => {
                        const x =
                          (i / (chartPoints.length - 1)) * 320;
                        const y = 110 - ((p.value - min) / span) * 100;
                        return `${x},${y}`;
                      })
                      .join(" ") +
                    ` 320,120`;
                  return (
                    <>
                      <defs>
                        <linearGradient
                          id="pg"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor={color}
                            stopOpacity="0.25"
                          />
                          <stop
                            offset="100%"
                            stopColor={color}
                            stopOpacity="0"
                          />
                        </linearGradient>
                      </defs>
                      <polygon fill="url(#pg)" points={area} />
                      <polyline
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        points={pts}
                      />
                    </>
                  );
                })()}
              </svg>
            )}
            {!chartLoading && chartPoints.length <= 1 && (
              <p className="text-xs text-muted text-center pt-12">
                Sin histórico para el rango
              </p>
            )}
          </div>

          {periodChange != null && periodChangePct != null && (
            <p
              className={`text-center text-xs mb-2 ${
                periodChange >= 0 ? "text-success" : "text-danger"
              }`}
            >
              Periodo: {periodChange >= 0 ? "+" : ""}
              {formatMoney(periodChange, displayCurrency)} (
              {formatPercent(periodChangePct)})
            </p>
          )}

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 justify-center">
            {(
              [
                ["1d", "Día"],
                ["1s", "Sem."],
                ["1m", "Mes"],
                ["3m", "3M"],
                ["ytd", "YTD"],
                ["1y", "1A"],
                ["5y", "5A"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setChartRange(k)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 ${
                  chartRange === k
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="text-[10px] text-muted text-center mt-2">
            {summary.positionsCount} posiciones · TC 1 USD ={" "}
            {fxLoading ? "…" : usdMxn.toFixed(2)} MXN · precios en vivo
          </p>
          <p className="text-[10px] text-center mt-1 text-muted">
            Vista unificada en{" "}
            <span className="font-semibold text-foreground">{displayCurrency}</span>
            {displayCurrency !== "MXN" ? " · cambia a MXN para ver todo en pesos" : " (pesos mexicanos)"}
          </p>
        </section>

        {/* Eventos de la cartera */}
        <div className="px-4 pb-3 space-y-3">
          <PortfolioEvents
            symbols={eventSymbols}
            limit={10}
            title="¿Qué cobro pronto?"
            defaultFilter="dividend"
          />
          <RebalanceSuggestions
            positions={calculated.map((p) => ({
              symbol: p.symbol,
              name: p.name,
              marketValue: toDisplay(
                p.marketValue,
                (p.currency === "MXN" ? "MXN" : "USD") as "USD" | "MXN",
                displayCurrency,
                usdMxn
              ),
              region: p.region,
              currency: p.currency,
            }))}
            displayCurrency={displayCurrency}
          />
          <TaxEstimator
            holdings={positions.map((p) => ({
              symbol: p.symbol,
              region: p.region,
            }))}
          />
          <PortfolioBackup />
        </div>

        {/* Filtros */}
        <div className="px-4 pb-3 flex items-center gap-2">
          {[
            { key: "ALL", label: "Todas" },
            { key: "MX", label: "🇲🇽 México" },
            { key: "US", label: "🇺🇸 EE.UU." },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as "ALL" | "MX" | "US")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="px-4 pb-8">
          {filtered.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-4xl mb-3">💼</p>
              <p className="font-medium mb-1">Tu cartera está vacía</p>
              <p className="text-sm text-muted mb-5">
                Añade acciones, ETFS o FIBRAs que ya tengas para ver valor y peso en pesos
              </p>
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="min-h-[48px] px-6 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold"
              >
                Añadir primera posición
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((pos) => (
                <div
                  key={pos.id}
                  className="bg-card rounded-xl border border-border p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          pos.region === "MX"
                            ? "bg-green-500/15 text-green-600 dark:text-green-400"
                            : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        {pos.region}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-sm">{pos.symbol}</p>
                          <span className="text-[10px] text-muted bg-secondary px-1.5 py-0.5 rounded">
                            {pos.market}
                          </span>
                          {pos.hasLivePrice && (
                            <span className="text-[9px] text-success">●</span>
                          )}
                        </div>
                        <p className="text-xs text-muted truncate">{pos.name}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => removePosition(pos.id)}
                      className="text-muted hover:text-danger text-sm w-7 h-7 flex items-center justify-center flex-shrink-0"
                      aria-label="Eliminar"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                    <div>
                      <p className="text-xs text-muted">Cantidad</p>
                      <p className="font-medium">{pos.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted">Precio actual</p>
                      <p className="font-medium">
                        {formatMoney(pos.currentPrice, pos.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Costo promedio</p>
                      <p className="font-medium">
                        {formatMoney(pos.avgCost, pos.currency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted">Valor de mercado</p>
                      <p className="font-medium">
                        {formatMoney(pos.marketValue, pos.currency)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted mb-1">
                        Peso en cartera
                        {summary.totalValue > 0 && (
                          <span className="font-medium text-foreground ml-1">
                            {(
                              (toDisplay(
                                pos.marketValue,
                                (pos.currency === "MXN" ? "MXN" : "USD") as
                                  | "USD"
                                  | "MXN",
                                displayCurrency,
                                usdMxn
                              ) /
                                summary.totalValue) *
                              100
                            ).toFixed(1)}
                            %
                          </span>
                        )}
                      </p>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/80"
                          style={{
                            width: `${
                              summary.totalValue > 0
                                ? Math.min(
                                    100,
                                    (toDisplay(
                                      pos.marketValue,
                                      (pos.currency === "MXN"
                                        ? "MXN"
                                        : "USD") as "USD" | "MXN",
                                      displayCurrency,
                                      usdMxn
                                    ) /
                                      summary.totalValue) *
                                      100
                                  )
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted">Ganancia / Pérdida</span>
                    <div className="text-right">
                      <p
                        className={`font-semibold text-sm ${
                          pos.pl >= 0 ? "text-success" : "text-danger"
                        }`}
                      >
                        {pos.pl >= 0 ? "+" : ""}
                        {formatMoney(pos.pl, pos.currency)}
                      </p>
                      <p
                        className={`text-xs font-medium ${
                          pos.plPercent >= 0 ? "text-success" : "text-danger"
                        }`}
                      >
                        {formatPercent(pos.plPercent)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal añadir */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowAdd(false)}
          />
          <div className="relative bg-card rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col safe-bottom">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="font-semibold">Añadir posición</h2>
              <button
                onClick={() => setShowAdd(false)}
                className="text-muted text-xl w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">
                  Mercado
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, region: "US" }))}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                      form.region === "US"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-muted"
                    }`}
                  >
                    🇺🇸 EE.UU.
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, region: "MX" }))}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                      form.region === "MX"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-muted"
                    }`}
                  >
                    🇲🇽 México
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">
                  Símbolo *
                </label>
                <input
                  type="text"
                  placeholder={form.region === "MX" ? "Ej. AMXL.MX" : "Ej. AAPL"}
                  value={form.symbol}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, symbol: e.target.value }))
                  }
                  className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">
                  Nombre (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Apple Inc."
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted mb-1.5 block">
                    Cantidad *
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, quantity: e.target.value }))
                    }
                    className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted mb-1.5 block">
                    Costo promedio *
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={form.avgCost}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, avgCost: e.target.value }))
                    }
                    className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border">
              <button
                onClick={handleAdd}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm active:scale-[0.98] transition-transform"
              >
                Añadir a la cartera
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
