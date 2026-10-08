"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { PortfolioEvents } from "@/components/PortfolioEvents";
import { TaxEstimator } from "@/components/TaxEstimator";
import { detectAssetType } from "@/lib/market-data/types";
import { useQuotes } from "@/lib/market-data/client";
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
  currency: "MXN" | "USD";
};

type DivRow = {
  symbol: string;
  name: string;
  quantity: number;
  avgCost: number;
  currency: string;
  price: number;
  annualPerShare: number;
  annualIncome: number;
  yieldOnCost: number;
  currentYield: number;
};

const POS_KEY = "marketpulse_positions";
const DIV_GOAL_KEY = "marketpulse_div_goal";
const DIV_PROJ_KEY = "marketpulse_div_proj";

const COLORS = [
  "#f97316",
  "#fb923c",
  "#fbbf24",
  "#34d399",
  "#2dd4bf",
  "#38bdf8",
  "#818cf8",
  "#e879f9",
  "#f472b6",
  "#a3e635",
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

/** Proyección de dividendos guardada, con los valores por defecto. */
function readDivProjection(): {
  divGrowth: number;
  stockGrowth: number;
  contribution: number;
} {
  const fallback = { divGrowth: 0.04, stockGrowth: 0.055, contribution: 9_000 };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(DIV_PROJ_KEY);
    if (!raw) return fallback;
    const j = JSON.parse(raw) as Record<string, unknown>;
    return {
      divGrowth:
        j.divGrowth != null ? Number(j.divGrowth) : fallback.divGrowth,
      stockGrowth:
        j.stockGrowth != null ? Number(j.stockGrowth) : fallback.stockGrowth,
      contribution:
        j.contribution != null
          ? Number(j.contribution)
          : fallback.contribution,
    };
  } catch {
    return fallback;
  }
}

function formatMoney(value: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "MXN",
    maximumFractionDigits: 2,
  }).format(value);
}

type DivPayment = { date: string; amount: number };

async function fetchDividendPayments(symbol: string): Promise<DivPayment[]> {
  try {
    const res = await fetch(
      `/api/dividends?symbol=${encodeURIComponent(symbol)}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    const list = data.dividends || [];
    return list.map((d: { date: string; amount: number }) => ({
      date: String(d.date),
      amount: Number(d.amount || 0),
    }));
  } catch {
    return [];
  }
}

function annualFromPayments(list: DivPayment[]): number {
  if (!list.length) return 0;
  if (list.length >= 4) {
    return list
      .slice(0, 4)
      .reduce((s, d) => s + d.amount, 0);
  }
  const sum = list.reduce((s, d) => s + d.amount, 0);
  return (sum / list.length) * 4;
}

export default function DividendAnalysisPage() {
  // Posiciones, meta y proyección se hidratan durante el render y siguen siendo
  // editables (antes: un effect con cinco setState síncronos).
  const positions = useHydratedValue<Position[]>(
    localStorageIdentity("marketpulse_positions"),
    loadPositions,
    EMPTY_POSITIONS
  );
  const [annualMap, setAnnualMap] = useState<Record<string, number>>({});
  const [paymentsMap, setPaymentsMap] = useState<
    Record<string, DivPayment[]>
  >({});
  const [upcoming, setUpcoming] = useState<
    Array<{
      symbol: string;
      exDate: string;
      amount: number | null;
      paymentDate?: string;
    }>
  >([]);
  const [growthMap, setGrowthMap] = useState<
    Record<string, { "1Y": number | null; "3Y": number | null; "5Y": number | null; "10Y": number | null }>
  >({});
  const [goal, setGoal] = useHydratedState(
    localStorageIdentity(DIV_GOAL_KEY),
    () => Number(localStorage.getItem(DIV_GOAL_KEY)) || 60_000,
    60_000
  );
  const [years, setYears] = useState(10);
  const [divGrowth, setDivGrowth] = useHydratedState(
    localStorageIdentity(DIV_PROJ_KEY),
    () => readDivProjection().divGrowth,
    0.04
  );
  const [stockGrowth, setStockGrowth] = useHydratedState(
    localStorageIdentity(DIV_PROJ_KEY),
    () => readDivProjection().stockGrowth,
    0.055
  );
  const [contribution, setContribution] = useHydratedState(
    localStorageIdentity(DIV_PROJ_KEY),
    () => readDivProjection().contribution,
    9_000
  );
  const [showGoal, setShowGoal] = useState(false);
  const [showProj, setShowProj] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);


  const symbols = useMemo(
    () => [...new Set(positions.map((p) => p.symbol))],
    [positions]
  );

  const { data: quotesData, loading: quotesLoading } = useQuotes(
    symbols,
    60_000
  );

  const priceMap = useMemo(() => {
    const m = new Map<string, number>();
    (quotesData?.quotes ?? []).forEach((q) =>
      m.set(q.symbol.toUpperCase(), q.price)
    );
    return m;
  }, [quotesData]);

  // `loadingDivs` se deriva de para qué lista de símbolos terminó la carga, en
  // vez de setearse en síncrono dentro del effect.
  const [divsNonce, setDivsNonce] = useState(0);
  const divsKey = `${symbols.join(",")}|${divsNonce}`;
  const [divsSettledFor, setDivsSettledFor] = useState<string | null>(null);
  const loadingDivs = symbols.length > 0 && divsSettledFor !== divsKey;

  // Reintento: solo cambia la clave; el effect de abajo reacciona.
  const loadDivs = useCallback(() => setDivsNonce((n) => n + 1), []);

  useEffect(() => {
    if (!symbols.length) return;
    let cancelled = false;
    void (async () => {
      const next: Record<string, number> = {};
      const growth: Record<
        string,
        { "1Y": number | null; "3Y": number | null; "5Y": number | null; "10Y": number | null }
      > = {};

      // Calendario próximos (batch)
      try {
        const calRes = await fetch(
          `/api/portfolio-dividends?symbols=${encodeURIComponent(symbols.join(","))}`
        );
        if (!cancelled && calRes.ok) {
          const cal = await calRes.json();
          if (!cancelled) setUpcoming(cal.upcoming || []);
        }
      } catch {
        /* */
      }

      // secuencial para no saturar APIs free
      const pays: Record<string, DivPayment[]> = {};
      for (const s of symbols) {
        if (cancelled) return;
        const key = s.toUpperCase();
        const list = await fetchDividendPayments(s);
        pays[key] = list;
        next[key] = annualFromPayments(list);
        try {
          const gRes = await fetch(
            `/api/dividend-growth?symbol=${encodeURIComponent(s)}`
          );
          if (gRes.ok) {
            const g = await gRes.json();
            growth[key] = g.growth || {
              "1Y": null,
              "3Y": null,
              "5Y": null,
              "10Y": null,
            };
          }
        } catch {
          /* */
        }
      }
      if (cancelled) return;
      setAnnualMap(next);
      setPaymentsMap(pays);
      setGrowthMap(growth);
      setDivsSettledFor(divsKey);
    })();
    return () => {
      cancelled = true;
    };
  }, [symbols, divsKey]);

  const rows: DivRow[] = useMemo(() => {
    return positions.map((p) => {
      const price = priceMap.get(p.symbol.toUpperCase()) ?? p.avgCost;
      const annualPerShare = annualMap[p.symbol.toUpperCase()] ?? 0;
      const annualIncome = annualPerShare * p.quantity;
      const cost = p.avgCost * p.quantity;
      const market = price * p.quantity;
      return {
        symbol: p.symbol,
        name: p.name,
        quantity: p.quantity,
        avgCost: p.avgCost,
        currency: p.currency,
        price,
        annualPerShare,
        annualIncome,
        yieldOnCost: cost > 0 ? (annualIncome / cost) * 100 : 0,
        currentYield: market > 0 ? (annualIncome / market) * 100 : 0,
      };
    });
  }, [positions, priceMap, annualMap]);

  const annualTotal = rows.reduce((s, r) => s + r.annualIncome, 0);
  const monthly = annualTotal / 12;
  const weekly = annualTotal / 52;
  const daily = annualTotal / 365;
  const hourly = annualTotal / (365 * 24);

  const totalMarket = rows.reduce((s, r) => s + r.price * r.quantity, 0);
  const totalCost = rows.reduce((s, r) => s + r.avgCost * r.quantity, 0);
  const portfolioYield =
    totalMarket > 0 ? (annualTotal / totalMarket) * 100 : 0;
  const yieldOnCost =
    totalCost > 0 ? (annualTotal / totalCost) * 100 : 0;

  const monthNames = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];

  /** Ingreso estimado por mes calendario según historial de pagos × cantidad */
  const monthlyIncome = useMemo(() => {
    const totals = Array(12).fill(0) as number[];
    for (const p of positions) {
      const key = p.symbol.toUpperCase();
      const list = paymentsMap[key] || [];
      // Usar pagos del último año disponible (12 meses hacia atrás desde el más reciente)
      if (!list.length) continue;
      const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
      const latest = sorted[0]?.date;
      if (!latest) continue;
      const latestD = new Date(latest.includes("T") ? latest : latest + "T12:00:00");
      const cutoff = new Date(latestD);
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      const recent = sorted.filter((d) => {
        const dt = new Date(d.date.includes("T") ? d.date : d.date + "T12:00:00");
        return dt >= cutoff;
      });
      const useList = recent.length ? recent : sorted.slice(0, 4);
      for (const d of useList) {
        const dt = new Date(d.date.includes("T") ? d.date : d.date + "T12:00:00");
        if (Number.isNaN(dt.getTime())) continue;
        const m = dt.getMonth(); // 0-11
        totals[m] += d.amount * p.quantity;
      }
    }
    return totals;
  }, [positions, paymentsMap]);

  const maxMonthly = Math.max(...monthlyIncome, 0.01);

  /** Detalle por mes: emisoras y montos */
  const monthlyDetails = useMemo(() => {
    const byMonth: Array<
      Array<{ symbol: string; amount: number; date: string }>
    > = Array.from({ length: 12 }, () => []);

    for (const p of positions) {
      const key = p.symbol.toUpperCase();
      const list = paymentsMap[key] || [];
      if (!list.length) continue;
      const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
      const latest = sorted[0]?.date;
      if (!latest) continue;
      const latestD = new Date(
        latest.includes("T") ? latest : latest + "T12:00:00"
      );
      const cutoff = new Date(latestD);
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      const recent = sorted.filter((d) => {
        const dt = new Date(
          d.date.includes("T") ? d.date : d.date + "T12:00:00"
        );
        return dt >= cutoff;
      });
      const useList = recent.length ? recent : sorted.slice(0, 4);
      for (const d of useList) {
        const dt = new Date(
          d.date.includes("T") ? d.date : d.date + "T12:00:00"
        );
        if (Number.isNaN(dt.getTime())) continue;
        const m = dt.getMonth();
        const income = d.amount * p.quantity;
        if (income <= 0) continue;
        byMonth[m].push({
          symbol: p.symbol,
          amount: income,
          date: d.date.slice(0, 10),
        });
      }
    }
    // consolidar mismo símbolo en el mismo mes
    return byMonth.map((arr) => {
      const map = new Map<string, { symbol: string; amount: number; dates: string[] }>();
      for (const x of arr) {
        const cur = map.get(x.symbol);
        if (cur) {
          cur.amount += x.amount;
          if (!cur.dates.includes(x.date)) cur.dates.push(x.date);
        } else {
          map.set(x.symbol, {
            symbol: x.symbol,
            amount: x.amount,
            dates: [x.date],
          });
        }
      }
      return [...map.values()].sort((a, b) => b.amount - a.amount);
    });
  }, [positions, paymentsMap]);



  const goalPct = goal > 0 ? Math.min(100, (annualTotal / goal) * 100) : 0;

  // Proyección de ingreso por dividendos: reinversión simple
  // cada año: ingreso crece con divGrowth; capital con stockGrowth + contribution
  // aproximación: annualIncome * (1+divGrowth)^years * (ajustado por crecimiento de posición)
  const futureIncome = useMemo(() => {
    let income = annualTotal;
    let value = totalMarket;
    for (let y = 0; y < years; y++) {
      value = value * (1 + stockGrowth) + contribution;
      // yield se mantiene aprox; ingreso escala con valor y crecimiento de div
      const yld = totalMarket > 0 ? annualTotal / totalMarket : 0;
      income = value * yld * Math.pow(1 + divGrowth, y + 1);
    }
    // más simple y estable:
    return annualTotal * Math.pow(1 + divGrowth, years) *
      Math.pow(1 + stockGrowth * 0.3, years); // factor suave por reinversión
  }, [annualTotal, years, divGrowth, stockGrowth, totalMarket, contribution]);

  // chart points
  const chartPts = useMemo(() => {
    const pts: number[] = [];
    for (let y = 0; y <= Math.min(years, 12); y++) {
      pts.push(
        annualTotal *
          Math.pow(1 + divGrowth, y) *
          Math.pow(1 + stockGrowth * 0.3, y)
      );
    }
    return pts;
  }, [annualTotal, years, divGrowth, stockGrowth]);

  const allocation = useMemo(() => {
    return [...rows]
      .filter((r) => r.annualIncome > 0)
      .sort((a, b) => b.annualIncome - a.annualIncome)
      .map((r, i) => ({
        label: r.symbol,
        value: r.annualIncome,
        pct: annualTotal ? (r.annualIncome / annualTotal) * 100 : 0,
        color: COLORS[i % COLORS.length],
      }));
  }, [rows, annualTotal]);

  const mainCurrency =
    rows.filter((r) => r.currency === "MXN").length >=
    rows.filter((r) => r.currency === "USD").length
      ? "MXN"
      : "USD";

  const loading = quotesLoading || loadingDivs;

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border safe-top">
        <div className="flex items-center gap-2 px-3 h-14 max-w-lg mx-auto">
          <Link
            href="/dividends"
            className="w-9 h-9 flex items-center justify-center text-muted text-lg"
          >
            ‹
          </Link>
          <h1 className="text-lg font-bold flex-1">Análisis de dividendos</h1>
          <button
            type="button"
            onClick={() => loadDivs()}
            className="w-9 h-9 rounded-full border border-border text-muted text-sm"
          >
            ↻
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 pb-10 pt-4 space-y-6">
        {positions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">💰</p>
            <p className="font-medium">Sin posiciones en cartera</p>
            <p className="text-sm text-muted mt-1">
              Añade activos en Cartera para estimar ingresos por dividendos
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
            {/* Ingreso anual */}
            <section className="text-center">
              <p className="text-3xl font-bold tracking-tight">
                {loading ? "…" : formatMoney(annualTotal, mainCurrency)}
              </p>
              <p className="text-xs text-muted mt-1">Anual (estimado)</p>
              <div className="grid grid-cols-2 gap-2.5 mt-4 text-center">
                <div className="bg-card border border-border rounded-2xl p-3.5">
                  <p className="font-bold text-base">
                    {formatMoney(monthly, mainCurrency)}
                  </p>
                  <p className="text-[11px] text-muted mt-0.5">Mensual</p>
                </div>
                <div className="bg-card border border-border rounded-2xl p-3.5">
                  <p className="font-bold text-base">
                    {formatMoney(weekly, mainCurrency)}
                  </p>
                  <p className="text-[11px] text-muted mt-0.5">Semanal</p>
                </div>
                <div className="bg-card border border-border rounded-2xl p-3.5">
                  <p className="font-bold text-base">
                    {formatMoney(daily, mainCurrency)}
                  </p>
                  <p className="text-[11px] text-muted mt-0.5">Diario</p>
                </div>
                <div className="bg-card border border-border rounded-2xl p-3.5">
                  <p className="font-bold text-base">
                    {formatMoney(hourly, mainCurrency)}
                  </p>
                  <p className="text-[11px] text-muted mt-0.5">Por hora</p>
                </div>
              </div>
              <p className="text-[10px] text-muted mt-2 leading-relaxed">
                Semanal = anual ÷ 52 · Diario = anual ÷ 365 · Por hora = anual ÷
                (365 × 24). Son promedios del dividendo estimado, no pagos reales
                cada hora.
              </p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-card border border-border rounded-xl p-3">
                  <p className="text-lg font-bold">
                    {portfolioYield.toFixed(2)} %
                  </p>
                  <p className="text-[10px] text-muted">Rentabilidad</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-3">
                  <p className="text-lg font-bold">
                    {yieldOnCost.toFixed(2)} %
                  </p>
                  <p className="text-[10px] text-muted">Sobre costo</p>
                </div>
              </div>
              <p className="text-[10px] text-muted mt-3 leading-relaxed">
                Estimado con los últimos pagos históricos × cantidad en cartera.
                MXN/USD no se convierten automáticamente.
              </p>
            </section>

            {/* Meta ingresos pasivos */}
            <section className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">
                  Meta de ingresos pasivos
                </h2>
                <button
                  type="button"
                  className="text-xs text-primary font-medium"
                  onClick={() => {
                    setGoalInput(String(goal));
                    setShowGoal(true);
                  }}
                >
                  Establecer
                </button>
              </div>
              <p className="text-xl font-bold">
                {formatMoney(annualTotal, mainCurrency)}
                <span className="text-sm font-normal text-muted">
                  {" "}
                  / {formatMoney(goal, mainCurrency)} anual
                </span>
              </p>
              <div className="h-2 rounded-full bg-secondary mt-3 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${goalPct}%` }}
                />
              </div>
              <p className="text-[11px] text-muted mt-2">
                {goalPct.toFixed(0)}% de la meta
              </p>
              <div className="grid grid-cols-3 gap-2 mt-3 text-[11px] text-muted">
                <div>
                  {formatMoney(monthly, mainCurrency)} /{" "}
                  {formatMoney(goal / 12, mainCurrency)}
                  <br />
                  Mensual
                </div>
                <div>
                  {formatMoney(daily, mainCurrency)} /{" "}
                  {formatMoney(goal / 365, mainCurrency)}
                  <br />
                  Diario
                </div>
                <div>
                  {formatMoney(hourly, mainCurrency)} /{" "}
                  {formatMoney(goal / (365 * 24), mainCurrency)}
                  <br />
                  Hora
                </div>
              </div>
            </section>

            {/* Valor futuro dividendos */}
            <section className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">Valor futuro</h2>
                <button
                  type="button"
                  className="text-xs text-primary font-medium"
                  onClick={() => setShowProj(true)}
                >
                  Definir valores ›
                </button>
              </div>
              <p className="text-2xl font-bold">
                {formatMoney(futureIncome, mainCurrency)}
              </p>
              <p className="text-xs text-muted">
                Dividendos anuales estimados ({years} años)
              </p>
              <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
                {[1, 3, 5, 10, 25, 40].map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setYears(y)}
                    className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ${
                      years === y
                        ? "bg-amber-500 text-black"
                        : "bg-secondary text-muted"
                    }`}
                  >
                    {y}
                    {y === 10 ? " Años" : ""}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-[11px] px-2 py-1 rounded-full bg-secondary">
                  {(divGrowth * 100).toFixed(1)}% div. growth
                </span>
                <span className="text-[11px] px-2 py-1 rounded-full bg-secondary">
                  {(stockGrowth * 100).toFixed(1)}% stock growth
                </span>
                <span className="text-[11px] px-2 py-1 rounded-full bg-secondary">
                  Aporte {formatMoney(contribution, mainCurrency)}
                </span>
              </div>
              {chartPts.length > 1 && (
                <div className="mt-4 h-24">
                  <svg
                    viewBox="0 0 300 80"
                    className="w-full h-full"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {(() => {
                      const min = Math.min(...chartPts);
                      const max = Math.max(...chartPts);
                      const span = max - min || 1;
                      const line = chartPts
                        .map((v, i) => {
                          const x = (i / (chartPts.length - 1)) * 300;
                          const y = 70 - ((v - min) / span) * 60;
                          return `${x},${y}`;
                        })
                        .join(" ");
                      const area =
                        `0,80 ` +
                        chartPts
                          .map((v, i) => {
                            const x = (i / (chartPts.length - 1)) * 300;
                            const y = 70 - ((v - min) / span) * 60;
                            return `${x},${y}`;
                          })
                          .join(" ") +
                        ` 300,80`;
                      return (
                        <>
                          <polygon fill="url(#dg)" points={area} />
                          <polyline
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="2"
                            points={line}
                          />
                        </>
                      );
                    })()}
                  </svg>
                </div>
              )}
              <p className="text-[11px] text-muted mt-2 leading-relaxed">
                Proyección educativa. No garantiza ingresos futuros.
              </p>
            </section>

            {/* Distribución */}
            {allocation.length > 0 && (
              <section className="bg-card rounded-xl border border-border p-4">
                <h2 className="text-sm font-semibold mb-3">
                  Distribución del ingreso
                </h2>
                <div className="space-y-2">
                  {allocation.map((a) => (
                    <div key={a.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: a.color }}
                          />
                          {a.label}
                        </span>
                        <span className="text-muted">
                          {a.pct.toFixed(1)}% ·{" "}
                          {formatMoney(a.value, mainCurrency)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${a.pct}%`,
                            background: a.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <PortfolioEvents
              symbols={positions.map((p) => p.symbol)}
              limit={10}
              title="Eventos: dividendos, earnings y splits"
            />
            <TaxEstimator
              holdings={rows.map((r) => ({
                symbol: r.symbol,
                annualDividendIncome: r.annualIncome,
                assetType: detectAssetType(r.symbol),
              }))}
              annualDividendTotal={annualTotal}
            />

            {/* Próximos ex-dividendo de la cartera */}
            <section className="bg-card rounded-xl border border-border p-4">
              <h2 className="text-sm font-semibold mb-3">Próximos en tu cartera</h2>
              {upcoming.length === 0 ? (
                <p className="text-xs text-muted leading-relaxed">
                  No hay ex-dividendo próximo en el calendario (90 días) para tus
                  símbolos US, o aún no cargó. México puede no aparecer en el
                  calendario FMP gratis.
                </p>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((u, i) => (
                    <div
                      key={u.symbol + u.exDate + i}
                      className="flex items-center justify-between rounded-xl bg-amber-500/15 border border-amber-500/30 px-3 py-2.5"
                    >
                      <div>
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                          Ex-dividendo · {u.exDate}
                        </p>
                        <p className="font-semibold text-sm">{u.symbol}</p>
                      </div>
                      <p className="font-bold text-sm">
                        {u.amount != null ? formatMoney(u.amount, "USD") : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>


            {/* Ingreso por mes */}
            <section className="bg-card rounded-xl border border-border p-4">
              <h2 className="text-sm font-semibold mb-1">Meses</h2>
              <p className="text-[11px] text-muted mb-3 leading-relaxed">
                Estimación con pagos del último año × tus cantidades. Puede
                variar si cambian dividendos o fechas.
              </p>
              <div className="space-y-1.5">
                {monthNames.map((name, i) => {
                  const v = monthlyIncome[i] || 0;
                  const width = Math.max(8, (v / maxMonthly) * 100);
                  const open = selectedMonth === i;
                  return (
                    <div key={name}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedMonth(open ? null : i)
                        }
                        className="w-full flex items-center gap-2 text-sm py-0.5"
                      >
                        <span className="w-20 text-muted capitalize shrink-0 text-left">
                          {name}
                        </span>
                        <div className="flex-1 flex justify-end">
                          <div
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold tabular-nums flex items-center gap-1 ${
                              open
                                ? "bg-amber-500 text-black"
                                : "bg-amber-700/80 text-amber-50"
                            }`}
                            style={{
                              minWidth: v > 0 ? `${width}%` : undefined,
                            }}
                          >
                            {v > 0
                              ? formatMoney(v, mainCurrency)
                              : "—"}
                            <span className="opacity-70">›</span>
                          </div>
                        </div>
                      </button>
                      {open && (
                        <div className="ml-2 mt-1 mb-2 rounded-xl border border-border bg-background/50 px-3 py-2 space-y-1.5">
                          {(monthlyDetails[i] || []).length === 0 ? (
                            <p className="text-[11px] text-muted">
                              Sin pagos estimados este mes
                            </p>
                          ) : (
                            monthlyDetails[i].map((row) => (
                              <div
                                key={row.symbol}
                                className="flex items-center justify-between text-sm"
                              >
                                <div className="min-w-0">
                                  <p className="font-medium">{row.symbol}</p>
                                  <p className="text-[10px] text-muted truncate">
                                    {row.dates.join(", ")}
                                  </p>
                                </div>
                                <p className="font-semibold tabular-nums shrink-0">
                                  {formatMoney(row.amount, mainCurrency)}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Crecimiento de dividendos */}
            <section className="bg-card rounded-xl border border-border p-4">
              <h2 className="text-sm font-semibold mb-3">
                Crecimiento de dividendos
              </h2>
              <p className="text-[11px] text-muted mb-3 leading-relaxed">
                CAGR calculado con historial de pagos (1A / 3A / 5A / 10A). API:{" "}
                <code className="text-foreground">/api/dividend-growth</code>
              </p>
              {Object.keys(growthMap).length === 0 ? (
                <p className="text-xs text-muted">
                  {loading ? "Calculando…" : "Sin datos de crecimiento aún"}
                </p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(growthMap).map(([sym, g]) => (
                    <div key={sym} className="border border-border rounded-xl p-3">
                      <p className="font-semibold text-sm mb-2">{sym}</p>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        {(["1Y", "3Y", "5Y", "10Y"] as const).map((k) => (
                          <div key={k}>
                            <p className="text-sm font-bold">
                              {g[k] != null
                                ? `${g[k]! >= 0 ? "+" : ""}${g[k]!.toFixed(1)}%`
                                : "—"}
                            </p>
                            <p className="text-[10px] text-muted">{k}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Detalle por posición */}
            <section className="bg-card rounded-xl border border-border overflow-hidden">
              <h2 className="text-sm font-semibold px-4 pt-4 pb-2">
                Por posición
              </h2>
              <div className="divide-y divide-border">
                {rows.map((r) => (
                  <div
                    key={r.symbol}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{r.symbol}</p>
                      <p className="text-[11px] text-muted">
                        {r.quantity} × {r.annualPerShare.toFixed(4)} /año
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">
                        {formatMoney(r.annualIncome, r.currency)}
                      </p>
                      <p className="text-[11px] text-muted">
                        {r.currentYield.toFixed(2)}% yield
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {showGoal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowGoal(false)}
          />
          <div className="relative bg-card rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-4 safe-bottom">
            <h3 className="font-semibold mb-3">Meta anual de dividendos</h3>
            <input
              type="number"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm mb-3"
            />
            <button
              type="button"
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
              onClick={() => {
                const n = Number(goalInput);
                if (n > 0) {
                  setGoal(n);
                  localStorage.setItem(DIV_GOAL_KEY, String(n));
                }
                setShowGoal(false);
              }}
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      {showProj && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowProj(false)}
          />
          <div className="relative bg-card rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-4 space-y-3 safe-bottom">
            <h3 className="font-semibold">Parámetros</h3>
            <div>
              <label className="text-xs text-muted">
                Crecimiento dividendos (0.04 = 4%)
              </label>
              <input
                type="number"
                step="0.001"
                value={divGrowth}
                onChange={(e) => setDivGrowth(Number(e.target.value) || 0)}
                className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted">
                Crecimiento de la acción
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
              <label className="text-xs text-muted">Aportación anual</label>
              <input
                type="number"
                value={contribution}
                onChange={(e) => setContribution(Number(e.target.value) || 0)}
                className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm mt-1"
              />
            </div>
            <button
              type="button"
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
              onClick={() => {
                localStorage.setItem(
                  DIV_PROJ_KEY,
                  JSON.stringify({ divGrowth, stockGrowth, contribution })
                );
                setShowProj(false);
              }}
            >
              Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
