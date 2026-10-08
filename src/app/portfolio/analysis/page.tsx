"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useQuotes } from "@/lib/market-data/client";
import { useUsdMxn, toDisplay } from "@/lib/fx";
import { RebalanceSuggestions } from "@/components/RebalanceSuggestions";
import {
  useHydratedValue,
  useHydratedState,
  localStorageIdentity,
} from "@/lib/use-hydrated-value";

type Position = {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  avgCost: number;
  region: "MX" | "US";
  market: string;
  currency: "MXN" | "USD";
};

const POS_KEY = "marketpulse_positions";
const GOAL_KEY = "marketpulse_goal";
const PROJ_KEY = "marketpulse_projection";

const COLORS = [
  "#f97316",
  "#fb923c",
  "#fbbf24",
  "#a3e635",
  "#34d399",
  "#2dd4bf",
  "#38bdf8",
  "#818cf8",
  "#e879f9",
  "#f472b6",
];

function loadPositions(): Position[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** Constante de módulo: useSyncExternalStore exige un snapshot estable. */
const EMPTY_POSITIONS: Position[] = [];

/** Proyección guardada, con los valores por defecto de la app. */
function readProjection(): { stockGrowth: number; annualContribution: number } {
  const fallback = { stockGrowth: 0.055, annualContribution: 9000 };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(PROJ_KEY);
    if (!raw) return fallback;
    const j = JSON.parse(raw) as Record<string, unknown>;
    return {
      stockGrowth:
        j.stockGrowth != null ? Number(j.stockGrowth) : fallback.stockGrowth,
      annualContribution:
        j.annualContribution != null
          ? Number(j.annualContribution)
          : fallback.annualContribution,
    };
  } catch {
    return fallback;
  }
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency === "MXN" ? "MXN" : "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPct(n: number) {
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(2)}%`;
}

/** Proyección simple: valor * (1+g)^n + contribuciones anuales */
function projectValue(
  current: number,
  years: number,
  stockGrowth: number,
  annualContribution: number
) {
  let v = current;
  for (let y = 0; y < years; y++) {
    v = v * (1 + stockGrowth) + annualContribution;
  }
  return v;
}

function yearsToGoal(
  current: number,
  goal: number,
  stockGrowth: number,
  annualContribution: number
) {
  if (goal <= current) return 0;
  if (stockGrowth <= 0 && annualContribution <= 0) return Infinity;
  let v = current;
  let y = 0;
  while (v < goal && y < 120) {
    v = v * (1 + Math.max(stockGrowth, 0)) + Math.max(annualContribution, 0);
    y++;
  }
  return y >= 120 ? Infinity : y;
}

function Donut({
  slices,
}: {
  slices: Array<{ label: string; value: number; color: string }>;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = 42;
  const c = 2 * Math.PI * r;
  // Desplazamiento acumulado calculado antes de pintar, sin mutar nada dentro
  // del map (que es lo que marcaba react-hooks/immutability).
  const arcs = slices.reduce<Array<{ label: string; color: string; dash: number; offset: number }>>(
    (acc, sl) => {
      const dash = (sl.value / total) * c;
      const prev = acc[acc.length - 1];
      acc.push({
        label: sl.label,
        color: sl.color,
        dash,
        offset: prev ? prev.offset + prev.dash : 0,
      });
      return acc;
    },
    []
  );
  return (
    <div className="relative w-48 h-48 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        {arcs.map((arc) => (
          <circle
            key={arc.label}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={arc.color}
            strokeWidth="12"
            strokeDasharray={`${arc.dash} ${c - arc.dash}`}
            strokeDashoffset={-arc.offset}
          />
        ))}
        <circle cx="50" cy="50" r="30" className="fill-[var(--card)]" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-xs font-semibold text-muted">Activos</span>
      </div>
    </div>
  );
}

export default function PortfolioAnalysisPage() {
  // Todo lo que viene del dispositivo se hidrata durante el render y sigue
  // siendo editable (antes: un effect con cinco setState síncronos).
  const positions = useHydratedValue<Position[]>(
    localStorageIdentity(POS_KEY),
    loadPositions,
    EMPTY_POSITIONS
  );
  const [goal, setGoal] = useHydratedState(
    localStorageIdentity(GOAL_KEY),
    () => Number(localStorage.getItem(GOAL_KEY)) || 3_000_000,
    3_000_000
  );
  const [years, setYears] = useState(1);
  const [stockGrowth, setStockGrowth] = useHydratedState(
    localStorageIdentity(PROJ_KEY),
    () => readProjection().stockGrowth,
    0.055
  );
  const [annualContribution, setAnnualContribution] = useHydratedState(
    localStorageIdentity(PROJ_KEY),
    () => readProjection().annualContribution,
    9000
  );
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [showProjEdit, setShowProjEdit] = useState(false);
  // No se hidrata: la moneda de esta pantalla siempre arranca en MXN.
  const [displayCurrency, setDisplayCurrency] = useState<"USD" | "MXN">("MXN");
  const { fx, loading: fxLoading } = useUsdMxn();
  const usdMxn = fx?.usdMxn ?? 17;

  const symbols = useMemo(
    () => [...new Set(positions.map((p) => p.symbol))],
    [positions]
  );
  const { data: quotesData, loading } = useQuotes(symbols, 30_000);

  const priceMap = useMemo(() => {
    const m = new Map<string, number>();
    (quotesData?.quotes ?? []).forEach((q) =>
      m.set(q.symbol.toUpperCase(), q.price)
    );
    return m;
  }, [quotesData]);

  // Valores en moneda nativa por posición; total mostrado mezclado por región dominante
  const rows = useMemo(() => {
    return positions.map((p) => {
      const price = priceMap.get(p.symbol.toUpperCase()) ?? p.avgCost;
      const marketValue = price * p.quantity;
      const cost = p.avgCost * p.quantity;
      const pnl = marketValue - cost;
      const pnlPct = cost ? (pnl / cost) * 100 : 0;
      return { ...p, price, marketValue, cost, pnl, pnlPct };
    });
  }, [positions, priceMap]);

  const totalValue = rows.reduce((s, r) => {
    const cur = (r.currency === "MXN" ? "MXN" : "USD") as "USD" | "MXN";
    return s + toDisplay(r.marketValue, cur, displayCurrency, usdMxn);
  }, 0);
  const totalCost = rows.reduce((s, r) => {
    const cur = (r.currency === "MXN" ? "MXN" : "USD") as "USD" | "MXN";
    return s + toDisplay(r.cost, cur, displayCurrency, usdMxn);
  }, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost ? (totalPnl / totalCost) * 100 : 0;

  // Asignación
  const allocation = useMemo(() => {
    return [...rows]
      .map((r) => {
        const cur = (r.currency === "MXN" ? "MXN" : "USD") as "USD" | "MXN";
        const value = toDisplay(r.marketValue, cur, displayCurrency, usdMxn);
        return { ...r, valueConv: value };
      })
      .sort((a, b) => b.valueConv - a.valueConv)
      .map((r, i) => ({
        label: r.symbol,
        value: r.valueConv,
        pct: totalValue ? (r.valueConv / totalValue) * 100 : 0,
        color: COLORS[i % COLORS.length],
      }));
  }, [rows, totalValue, displayCurrency, usdMxn]);

  const byRegion = useMemo(() => {
    const mx = rows
      .filter((r) => r.region === "MX")
      .reduce((s, r) => {
        const cur = (r.currency === "MXN" ? "MXN" : "USD") as "USD" | "MXN";
        return s + toDisplay(r.marketValue, cur, displayCurrency, usdMxn);
      }, 0);
    const us = rows
      .filter((r) => r.region === "US")
      .reduce((s, r) => {
        const cur = (r.currency === "MXN" ? "MXN" : "USD") as "USD" | "MXN";
        return s + toDisplay(r.marketValue, cur, displayCurrency, usdMxn);
      }, 0);
    return [
      { label: "México", value: mx, color: "#34d399" },
      { label: "EE.UU.", value: us, color: "#38bdf8" },
    ].filter((x) => x.value > 0);
  }, [rows, displayCurrency, usdMxn]);

  const future = projectValue(
    totalValue,
    years,
    stockGrowth,
    annualContribution
  );
  const ytg = yearsToGoal(
    totalValue,
    goal,
    stockGrowth,
    annualContribution
  );
  const goalPct = goal > 0 ? Math.min(100, (totalValue / goal) * 100) : 0;

  // Serie simple para gráfico de proyección (por trimestre del primer año o por años)
  const chartPoints = useMemo(() => {
    const pts: number[] = [];
    const steps = Math.min(years, 10);
    for (let i = 0; i <= steps; i++) {
      pts.push(projectValue(totalValue, i, stockGrowth, annualContribution));
    }
    return pts;
  }, [totalValue, years, stockGrowth, annualContribution]);

  const mainCurrency = displayCurrency;

  const saveGoal = () => {
    const n = Number(goalInput.replace(/,/g, ""));
    if (n > 0) {
      setGoal(n);
      localStorage.setItem(GOAL_KEY, String(n));
    }
    setShowGoalEdit(false);
  };

  const saveProj = () => {
    localStorage.setItem(
      PROJ_KEY,
      JSON.stringify({ stockGrowth, annualContribution })
    );
    setShowProjEdit(false);
  };

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border safe-top">
        <div className="flex items-center gap-2 px-3 h-14 max-w-lg mx-auto">
          <Link
            href="/portfolio"
            className="w-9 h-9 flex items-center justify-center text-muted text-lg"
          >
            ‹
          </Link>
          <h1 className="text-lg font-bold flex-1">Análisis de portafolio</h1>
          <button
            type="button"
            onClick={() =>
              setDisplayCurrency((c) => (c === "MXN" ? "USD" : "MXN"))
            }
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border"
          >
            {displayCurrency}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 pb-10 space-y-6 pt-4">
        {positions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">💼</p>
            <p className="font-medium">Sin posiciones</p>
            <p className="text-sm text-muted mt-1">
              Añade activos en Cartera para ver el análisis
            </p>
            <Link
              href="/portfolio"
              className="inline-block mt-4 text-primary text-sm font-medium"
            >
              Ir a Cartera →
            </Link>
          </div>
        ) : (
          <>
            {/* Valor + P/L */}
            <section className="text-center">
              <p className="text-xs text-muted">Valor de mercado</p>
              <p className="text-3xl font-bold tracking-tight mt-1">
                {loading ? "…" : formatMoney(totalValue, mainCurrency)}
              </p>
              <div className="mt-3 space-y-1 text-sm">
                <p>
                  P/G abierto{" "}
                  <span
                    className={
                      totalPnl >= 0 ? "text-success font-medium" : "text-danger font-medium"
                    }
                  >
                    {totalPnl >= 0 ? "↑" : "↓"}
                    {formatMoney(Math.abs(totalPnl), mainCurrency)}{" "}
                    {formatPct(totalPnlPct)}
                  </span>
                </p>
                <p className="text-muted text-xs">
                  P/G cerradas — (no registradas aún)
                </p>
                <p>
                  P/G total{" "}
                  <span
                    className={
                      totalPnl >= 0 ? "text-success font-medium" : "text-danger font-medium"
                    }
                  >
                    {formatPct(totalPnlPct)}
                  </span>
                </p>
              </div>
              <p className="text-[10px] text-muted mt-2">
                Unificado con TC: 1 USD = {fxLoading ? "…" : usdMxn.toFixed(4)} MXN
                {fx?.source ? ` (${fx.source})` : ""}
              </p>
            </section>

            {/* Meta */}
            <section className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">Meta de valor de mercado</h2>
                <button
                  type="button"
                  onClick={() => {
                    setGoalInput(String(goal));
                    setShowGoalEdit(true);
                  }}
                  className="text-xs text-primary font-medium"
                >
                  Establecer meta
                </button>
              </div>
              <p className="text-xl font-bold">
                {formatMoney(totalValue, mainCurrency)}
                <span className="text-muted text-sm font-normal">
                  {" "}
                  / {formatMoney(goal, mainCurrency)}
                </span>
              </p>
              <div className="h-2 rounded-full bg-secondary mt-3 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${goalPct}%` }}
                />
              </div>
              <p className="text-[11px] text-muted mt-2">
                {goalPct.toFixed(0)}% ·{" "}
                {ytg === Infinity
                  ? "Ajusta crecimiento o aportaciones para estimar el plazo"
                  : ytg === 0
                  ? "Ya alcanzaste la meta"
                  : `Estimación: ~${ytg} años con la proyección actual. Solo fines educativos.`}
              </p>
            </section>

            {/* Valor futuro */}
            <section className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">Valor futuro</h2>
                <button
                  type="button"
                  onClick={() => setShowProjEdit(true)}
                  className="text-xs text-primary font-medium"
                >
                  Definir valores ›
                </button>
              </div>
              <p className="text-2xl font-bold">
                {formatMoney(future, mainCurrency)}
              </p>
              <p className="text-xs text-muted mt-0.5">
                Valor de mercado estimado ({years} año{years > 1 ? "s" : ""})
              </p>
              <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
                {[1, 3, 5, 10, 25, 40].map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setYears(y)}
                    className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ${
                      years === y
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted"
                    }`}
                  >
                    {y} {y === 1 ? "Año" : ""}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-[11px] px-2 py-1 rounded-full bg-secondary">
                  Crecimiento acción {(stockGrowth * 100).toFixed(1)}%
                </span>
                <span className="text-[11px] px-2 py-1 rounded-full bg-secondary">
                  Aporte anual {formatMoney(annualContribution, mainCurrency)}
                </span>
              </div>
              {/* Mini chart */}
              {chartPoints.length > 1 && (
                <div className="mt-4 h-24">
                  <svg
                    viewBox="0 0 300 80"
                    className="w-full h-full"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {(() => {
                      const min = Math.min(...chartPoints);
                      const max = Math.max(...chartPoints);
                      const span = max - min || 1;
                      const pts = chartPoints
                        .map((v, i) => {
                          const x =
                            (i / (chartPoints.length - 1)) * 300;
                          const y = 70 - ((v - min) / span) * 60;
                          return `${x},${y}`;
                        })
                        .join(" ");
                      const area =
                        `0,80 ` +
                        chartPoints
                          .map((v, i) => {
                            const x =
                              (i / (chartPoints.length - 1)) * 300;
                            const y = 70 - ((v - min) / span) * 60;
                            return `${x},${y}`;
                          })
                          .join(" ") +
                        ` 300,80`;
                      return (
                        <>
                          <polygon fill="url(#fg)" points={area} />
                          <polyline
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2"
                            points={pts}
                          />
                        </>
                      );
                    })()}
                  </svg>
                </div>
              )}
              <p className="text-[11px] text-muted mt-2 leading-relaxed">
                Proyección educativa asumiendo reinversión y tasas constantes.
                No garantiza resultados reales.
              </p>
            </section>

            {/* Asignación */}
            <section className="bg-card rounded-xl border border-border p-4">
              <h2 className="text-sm font-semibold mb-3">
                Asignación de activos
              </h2>
              <Donut slices={allocation} />
              <div className="mt-4 space-y-2">
                {allocation.map((a) => (
                  <div
                    key={a.label}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: a.color }}
                      />
                      <span className="truncate font-medium">{a.label}</span>
                    </div>
                    <span className="text-muted shrink-0">
                      {a.pct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <RebalanceSuggestions
              positions={rows.map((r) => ({
                symbol: r.symbol,
                name: r.name,
                marketValue: toDisplay(
                  r.marketValue,
                  (r.currency === "MXN" ? "MXN" : "USD") as "USD" | "MXN",
                  displayCurrency,
                  usdMxn
                ),
                region: r.region,
                currency: r.currency,
              }))}
              displayCurrency={displayCurrency}
            />

            {/* Por región (en lugar de sectores PRO) */}
            {byRegion.length > 0 && (
              <section className="bg-card rounded-xl border border-border p-4">
                <h2 className="text-sm font-semibold mb-3">Por mercado</h2>
                <Donut slices={byRegion} />
                <div className="mt-3 space-y-2">
                  {byRegion.map((a) => (
                    <div
                      key={a.label}
                      className="flex justify-between text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ background: a.color }}
                        />
                        {a.label}
                      </span>
                      <span className="text-muted">
                        {totalValue
                          ? ((a.value / totalValue) * 100).toFixed(1)
                          : 0}
                        %
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Modal meta */}
      {showGoalEdit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowGoalEdit(false)}
          />
          <div className="relative bg-card rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-4 safe-bottom">
            <h3 className="font-semibold mb-3">Meta de valor</h3>
            <input
              type="number"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm mb-3"
              placeholder="3000000"
            />
            <button
              type="button"
              onClick={saveGoal}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Modal proyección */}
      {showProjEdit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowProjEdit(false)}
          />
          <div className="relative bg-card rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-4 space-y-3 safe-bottom">
            <h3 className="font-semibold">Parámetros de proyección</h3>
            <div>
              <label className="text-xs text-muted">
                Crecimiento anual de la cartera (ej. 0.055 = 5.5%)
              </label>
              <input
                type="number"
                step="0.001"
                value={stockGrowth}
                onChange={(e) => setStockGrowth(Number(e.target.value) || 0)}
                className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted">
                Aportación anual
              </label>
              <input
                type="number"
                value={annualContribution}
                onChange={(e) =>
                  setAnnualContribution(Number(e.target.value) || 0)
                }
                className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm mt-1"
              />
            </div>
            <button
              type="button"
              onClick={saveProj}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
            >
              Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
