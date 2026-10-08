"use client";
import { pushRecentSymbol } from "@/lib/persist";

import { useUsdMxn, toMxn, formatMxn } from "@/lib/fx";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { getFibraMeta, splitFibraDistribution } from "@/lib/fibra-meta";
import { isSicSymbol } from "@/lib/sic-catalog";
import { estimateDividendTax, detectTaxAssetKind } from "@/lib/tax-mx";

type Quote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  currency: string;
  region: string;
  market?: string;
  source?: string;
};

type Candle = { t: number; o: number; h: number; l: number; c: number; v?: number };

function fmt(n: number, d = 2) {
  return n.toLocaleString("es-MX", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

function fmtPct(n: number) {
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(2)}%`;
}

function fmtBig(n?: number | null) {
  if (n == null) return "—";
  // Finnhub market cap often in millions
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}T`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}B`;
  if (n >= 1) return `${n.toFixed(1)}M`;
  return String(n);
}

function fmtMoney(n: number) {
  if (Math.abs(n) >= 1e12) return `${(n / 1e12).toFixed(2)} T`;
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(0)} mil M`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(0)} M`;
  return fmt(n, 0);
}

function Sparkline({
  data,
  times,
  positive,
  formatValue,
}: {
  data: number[];
  times?: number[];
  positive: boolean;
  formatValue?: (n: number) => string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  if (!data.length) {
    return (
      <div className="h-44 flex items-center justify-center text-muted text-sm">
        Sin datos del periodo
      </div>
    );
  }
  const w = 360;
  const h = 160;
  const pad = 8;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const xy = data.map((v, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return { x, y, v, i };
  });
  const points = xy.map((p) => `${p.x},${p.y}`).join(" ");
  const firstY = xy[0].y;
  const stroke = positive ? "#22c55e" : "#ef4444";

  const pick = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rel = (clientX - rect.left) / rect.width;
    const idx = Math.round(rel * (data.length - 1));
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    setActive(clamped);
  };

  const fmtVal = formatValue || ((n: number) => n.toFixed(2));
  const fmtDate = (ts?: number) => {
    if (ts == null) return "";
    const d = new Date(ts * 1000);
    return d.toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: data.length > 40 ? undefined : "2-digit",
      minute: data.length > 40 ? undefined : "2-digit",
    });
  };

  const a = active != null ? xy[active] : null;

  return (
    <div
      ref={ref}
      className="relative select-none touch-none"
      onMouseMove={(e) => pick(e.clientX)}
      onMouseLeave={() => setActive(null)}
      onTouchStart={(e) => {
        if (e.touches[0]) pick(e.touches[0].clientX);
      }}
      onTouchMove={(e) => {
        if (e.touches[0]) pick(e.touches[0].clientX);
      }}
      onTouchEnd={() => setActive(null)}
    >
      {a && (
        <div className="absolute left-0 right-0 top-0 z-10 flex flex-col items-center pointer-events-none">
          <p className="text-sm font-bold text-foreground bg-card/95 px-2 py-0.5 rounded-lg border border-border shadow-sm">
            {fmtVal(a.v)}
          </p>
          <p className="text-[10px] text-muted mt-0.5">
            {fmtDate(times?.[a.i])}
          </p>
        </div>
      )}
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-44" preserveAspectRatio="none">
        <line
          x1={pad}
          y1={firstY}
          x2={w - pad}
          y2={firstY}
          stroke="currentColor"
          strokeOpacity={0.15}
          strokeDasharray="4 4"
          strokeWidth={1}
        />
        <polyline
          fill="none"
          stroke={stroke}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />
        {a && (
          <>
            <line
              x1={a.x}
              y1={pad}
              x2={a.x}
              y2={h - pad}
              stroke="currentColor"
              strokeOpacity={0.35}
              strokeWidth={1}
            />
            <circle cx={a.x} cy={a.y} r={5} fill={stroke} stroke="#fff" strokeWidth={2} />
          </>
        )}
      </svg>
      {!a && (
        <p className="text-[10px] text-muted text-center -mt-1 pb-1">
          Mantén presionado el gráfico para ver el precio
        </p>
      )}
    </div>
  );
}


function IncomeChart({
  income,
}: {
  income: Array<{ year: string; revenue: number; netIncome: number; margin: number }>;
}) {
  if (!income.length) return null;
  const maxRev = Math.max(...income.map((i) => i.revenue), 1);
  return (
    <div className="mt-3">
      <div className="flex items-end gap-1.5 h-28">
        {income.map((row) => (
          <div key={row.year} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
            <div
              className="w-full max-w-[28px] bg-blue-500/80 rounded-t"
              style={{ height: `${Math.max(8, (row.revenue / maxRev) * 100)}%` }}
              title={`Ingresos ${fmtMoney(row.revenue)}`}
            />
            <div
              className="w-full max-w-[28px] bg-emerald-400/90 rounded-t"
              style={{
                height: `${Math.max(4, (Math.abs(row.netIncome) / maxRev) * 100)}%`,
              }}
              title={`Neto ${fmtMoney(row.netIncome)}`}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1">
        {income.map((row) => (
          <div key={row.year} className="flex-1 text-center text-[10px] text-muted">
            {row.year}
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-2 text-[11px] text-muted">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/80" /> Ingresos
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400/90" /> Ingreso neto
        </span>
      </div>
    </div>
  );
}


function TaxSharesPanel({
  symbol,
  assetType,
  lastDivAmount,
  divCurrency,
  price,
  priceCurrency,
  divYieldPct,
  usdMxn,
}: {
  symbol: string;
  assetType?: string;
  lastDivAmount?: number | null;
  divCurrency?: string;
  price?: number | null;
  priceCurrency?: string;
  divYieldPct?: number | null;
  usdMxn: number | null;
}) {
  const [shares, setShares] = useState(10);
  const kind = detectTaxAssetKind(symbol, assetType);

  // Dividendo bruto por pago estimado por acción
  let perShare = lastDivAmount != null && lastDivAmount > 0 ? lastDivAmount : null;
  if (perShare == null && price != null && price > 0 && divYieldPct != null && divYieldPct > 0) {
    // yield anual % → pago trimestral aprox
    perShare = (price * (divYieldPct / 100)) / 4;
  }
  const grossNative = perShare != null ? perShare * Math.max(0, shares) : null;
  const fromCur =
    divCurrency ||
    priceCurrency ||
    (kind === "mx_stock" || kind === "fibra" ? "MXN" : "USD");

  const grossMxn =
    grossNative != null ? toMxn(grossNative, fromCur, usdMxn) : null;

  const with8 =
    grossMxn != null
      ? estimateDividendTax({
          grossDividend: grossMxn,
          assetKind: kind,
          scenario: "w8ben",
        })
      : null;
  const no8 =
    grossMxn != null
      ? estimateDividendTax({
          grossDividend: grossMxn,
          assetKind: kind,
          scenario: "no_w8ben",
        })
      : null;
  const mxOnly =
    grossMxn != null
      ? estimateDividendTax({
          grossDividend: grossMxn,
          assetKind: kind === "fibra" ? "fibra" : "mx_stock",
          scenario: "w8ben",
        })
      : null;

  return (
    <section className="bg-card rounded-xl border border-border p-4 mb-4">
      <h2 className="text-sm font-semibold mb-2">Impuestos (MX · orientativo)</h2>
      <p className="text-xs text-muted mb-3">
        Cálculo sobre <span className="font-medium text-foreground">acciones enteras</span> que
        indiques (no sobre un monto fijo).
      </p>
      <label className="text-xs text-muted block mb-1">¿Cuántas acciones tienes?</label>
      <input
        type="number"
        min={1}
        step={1}
        value={shares}
        onChange={(e) => setShares(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
        className="w-full mb-3 bg-background border border-border rounded-xl py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
      />
      {perShare == null ? (
        <p className="text-xs text-muted">
          Sin dividendo reciente para estimar. Cuando haya historial o yield, aquí verás el
          cálculo por tus acciones.
        </p>
      ) : (
        <div className="text-xs space-y-1.5 text-muted">
          <p>
            Dividendo estimado del último pago (o trimestral aprox.):{" "}
            <span className="text-foreground font-medium">
              {formatMxn(toMxn(perShare, fromCur, usdMxn), 4)}
            </span>{" "}
            por acción × <span className="text-foreground font-medium">{shares}</span> ={" "}
            <span className="text-foreground font-medium">
              {formatMxn(grossMxn || 0, 2)}
            </span>{" "}
            brutos
          </p>
          {(kind === "us_stock" || kind === "us_etf") && with8 && no8 && (
            <>
              <p>
                <span className="text-foreground font-medium">Con W-8BEN:</span> neto ~{" "}
                {formatMxn(with8.netApprox, 2)} (ret. US ~10%)
              </p>
              <p>
                <span className="text-foreground font-medium">Sin W-8BEN:</span> neto ~{" "}
                {formatMxn(no8.netApprox, 2)} (ret. US ~30%)
              </p>
            </>
          )}
          {kind === "mx_stock" && mxOnly && (
            <p>
              <span className="text-foreground font-medium">Acción MX:</span> neto orientativo ~{" "}
              {formatMxn(mxOnly.netApprox, 2)} (ISR estimado sobre el bruto de tus acciones)
            </p>
          )}
          {kind === "fibra" && mxOnly && (
            <p>
              <span className="text-foreground font-medium">FIBRA:</span> neto orientativo ~{" "}
              {formatMxn(mxOnly.netApprox, 2)}. El tratamiento real depende del tipo de
              distribución.
            </p>
          )}
          <p className="text-[10px] pt-1">
            No es asesoría fiscal. Verifica con tu contador y el SAT.
          </p>
        </div>
      )}
    </section>
  );
}

export default function AssetPage() {
  const { fx } = useUsdMxn(120_000);
  const usdMxn = fx?.usdMxn ?? null;
  const params = useParams();
  const router = useRouter();
  const raw = decodeURIComponent(String(params.symbol || ""));
  const [riskFreeMx, setRiskFreeMx] = useState<number | null>(null);
  const [range, setRange] = useState("1d");
  const [data, setData] = useState<{
    quote: Quote | null;
    profile: { name?: string; exchange?: string; industry?: string; country?: string; ipo?: string } | null;
    history: Candle[];
    stats: Record<string, number | null | undefined>;
    growth: Record<string, number | null | undefined>;
    finance: {
      netMargin?: number | null;
      grossMargin?: number | null;
      roe?: number | null;
      debtEquity?: number | null;
      income: Array<{ year: string; revenue: number; netIncome: number; margin: number }>;
    };
    recommendation: {
      strongBuy: number;
      buy: number;
      hold: number;
      sell: number;
      strongSell: number;
    } | null;
    priceTarget: {
      consensus: number | null;
      median: number | null;
      high: number | null;
      low: number | null;
      lastMonthAvg: number | null;
      lastMonthCount: number | null;
      lastQuarterAvg: number | null;
      lastQuarterCount: number | null;
    } | null;
    earnings: Array<{
      period: string;
      estimate: number | null;
      actual: number | null;
      surprisePercent: number | null;
      year?: number;
      quarter?: number;
    }>;
    dividends: Array<{ date: string; amount: number }>;
    sec?: {
      cik: string;
      name: string;
      source: string;
      filings: Array<{ date: string; form: string; accession: string; document?: string }>;
    } | null;
    dataSources?: Record<string, string | null>;
    assetType?: string;
  } | null>(null);
  // `loading` se deriva de para qué petición terminó la carga, en vez de
  // setearse en síncrono dentro del effect.
  const requestKey = raw ? `${raw}|${range}` : "";
  const [settledFor, setSettledFor] = useState<string | null>(null);
  const loading = requestKey !== "" && settledFor !== requestKey;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!raw) return;
    let cancelled = false;
    fetch(`/api/asset?symbol=${encodeURIComponent(raw)}&range=${range}`)
      .then(async (res) => {
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((j) => {
        if (!cancelled) {
          setData(j);
          // Alimenta "Vistos recientemente" del inicio. `pushRecentSymbol`
          // estaba importado pero nunca se llamaba, así que esa lista solo se
          // llenaba al restaurar un respaldo.
          pushRecentSymbol(raw);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error");
      })
      .finally(() => {
        if (!cancelled) setSettledFor(requestKey);
      });
    return () => {
      cancelled = true;
    };
  }, [raw, range, requestKey]);

  const quote = data?.quote ?? null;
  const closes = useMemo(
    () => (data?.history || []).map((h) => h.c),
    [data]
  );
  const chartTimes = useMemo(
    () => (data?.history || []).map((h) => h.t),
    [data]
  );
  const chartPositive = useMemo(() => {
    if (closes.length >= 2) return closes[closes.length - 1] >= closes[0];
    return (quote?.changePercent ?? 0) >= 0;
  }, [closes, quote?.changePercent]);
  const positive = (quote?.changePercent ?? 0) >= 0;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/risk-free")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.mxAnnualPct != null) setRiskFreeMx(Number(d.mxAnnualPct));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const name = data?.profile?.name || quote?.name || raw;

  const buyPct = useMemo(() => {
    const r = data?.recommendation;
    if (!r) return null;
    const total =
      r.strongBuy + r.buy + r.hold + r.sell + r.strongSell || 1;
    return Math.round(((r.strongBuy + r.buy) / total) * 100);
  }, [data]);

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border safe-top">
        <div className="flex items-center gap-2 px-3 h-14 max-w-lg mx-auto">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center text-muted text-lg"
            aria-label="Volver"
          >
            ‹
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold truncate">{raw}</h1>
              {data?.assetType && data.assetType !== "stock" && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary text-muted uppercase">
                  {data.assetType}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted truncate">{name}{isSicSymbol(raw) ? " · SIC" : ""}</p>
          </div>
          {quote && (
            <div className="text-right shrink-0 mr-1">
              <p className="text-sm font-bold leading-tight">
                {formatMxn(
                  toMxn(
                    quote.price,
                    quote.currency ||
                      (quote.region === "MX" ? "MXN" : "USD"),
                    usdMxn
                  )
                )}
              </p>
              <p
                className={`text-[11px] font-medium leading-tight ${
                  positive ? "text-success" : "text-danger"
                }`}
              >
                {fmtPct(quote.changePercent)}
              </p>
            </div>
          )}
          <Link
            href={`/alerts`}
            className="text-lg w-9 h-9 flex items-center justify-center"
            title="Alertas"
          >
            🔔
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 pb-10">
        {loading ? (
          <div className="space-y-4 pt-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-card rounded-xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16 px-4">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-medium mb-1">No se pudo cargar</p>
            <p className="text-sm text-muted mb-4">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-[48px] px-6 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <>
            {/* Precio */}
            <section className="pt-4 pb-2">
              <p className="text-3xl font-bold tracking-tight">
                {quote ? formatMxn(toMxn(quote.price, quote.currency || (quote.region === "MX" ? "MXN" : "USD"), usdMxn)) : "—"}
                <span className="text-sm font-medium text-muted ml-1">
                  MXN
                </span>
              </p>
              {quote && (
                <p
                  className={`text-sm font-semibold mt-1 ${
                    positive ? "text-success" : "text-danger"
                  }`}
                >
                  {fmtPct(quote.changePercent)}{" "}
                  <span className="font-normal text-muted">
                    ({quote.change >= 0 ? "+" : ""}
                    {fmt(quote.change)})
                  </span>
                </p>
              )}
            </section>

            {/* Variación del día / periodo */}
            {quote && (
              <div className="pb-2 space-y-0.5">
                <p
                  className={`text-sm font-semibold ${
                    positive ? "text-success" : "text-danger"
                  }`}
                >
                  {positive ? "↑" : "↓"}{" "}
                  {formatMxn(
                    Math.abs(
                      toMxn(
                        quote.change,
                        quote.currency || (quote.region === "MX" ? "MXN" : "USD"),
                        usdMxn
                      )
                    )
                  )}{" "}
                  ({fmtPct(quote.changePercent)}){" "}
                  <span className="font-medium text-muted">Sesión</span>
                </p>
              </div>
            )}

            <section className="bg-card rounded-2xl border border-border p-3 mb-3">
              <Sparkline
                data={closes}
                times={chartTimes}
                positive={chartPositive}
                formatValue={(n) =>
                  formatMxn(
                    toMxn(
                      n,
                      quote?.currency || (quote?.region === "MX" ? "MXN" : "USD"),
                      usdMxn
                    )
                  )
                }
              />
              <div className="flex gap-1.5 pt-2 overflow-x-auto no-scrollbar justify-between">
                {[
                  { key: "1d", label: "Día" },
                  { key: "1w", label: "Semana" },
                  { key: "1mo", label: "Mes" },
                  { key: "3mo", label: "3 meses" },
                  { key: "ytd", label: "Año en curso" },
                  { key: "1y", label: "Año" },
                  { key: "5y", label: "5A" },
                  { key: "max", label: "Todo" },
                ].map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRange(r.key)}
                    className={`min-w-[40px] px-2.5 py-2 rounded-full text-xs font-semibold ${
                      range === r.key
                        ? "bg-success/90 text-white"
                        : "text-muted"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Crecimiento */}
            {data?.growth &&
              (data.growth.eps5Y != null ||
                data.growth.eps3Y != null ||
                data.growth.rev5Y != null) && (
                <section className="bg-card rounded-xl border border-border p-4 mb-4">
                  <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
                    Crecimiento
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "EPS 5A", v: data.growth.eps5Y },
                      { label: "EPS 3A", v: data.growth.eps3Y },
                      { label: "EPS 1A", v: data.growth.eps1Y },
                      { label: "Ingresos 5A", v: data.growth.rev5Y },
                      { label: "Ingresos 3A", v: data.growth.rev3Y },
                      { label: "Ingresos 1A", v: data.growth.rev1Y },
                    ]
                      .filter((x) => x.v != null)
                      .map((x) => (
                        <div key={x.label}>
                          <p className="text-lg font-bold">
                            {fmtPct(Number(x.v))}
                          </p>
                          <p className="text-[11px] text-muted">{x.label}</p>
                        </div>
                      ))}
                  </div>
                </section>
              )}

            {/* Finanzas */}
            {(data?.finance?.netMargin != null ||
              (data?.finance?.income?.length ?? 0) > 0) && (
              <section className="bg-card rounded-xl border border-border p-4 mb-4">
                <h2 className="text-sm font-semibold mb-1">Finanzas</h2>
                {data?.finance?.netMargin != null && (
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-2xl font-bold">
                      {fmt(Number(data.finance.netMargin), 2)} %
                    </p>
                    <span className="text-xs text-muted">
                      Margen de beneficio
                    </span>
                    {Number(data.finance.netMargin) > 0 && (
                      <span className="text-[10px] font-medium bg-success/15 text-success px-2 py-0.5 rounded-full">
                        Rentable
                      </span>
                    )}
                  </div>
                )}
                <IncomeChart income={data?.finance?.income || []} />
                {(data?.finance?.income?.length ?? 0) > 0 && (
                  <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                    <div>
                      <p className="font-semibold">
                        {fmtMoney(
                          data!.finance.income[data!.finance.income.length - 1]
                            ?.revenue || 0
                        )}
                      </p>
                      <p className="text-[11px] text-muted">Ingresos (último FY)</p>
                    </div>
                    <div>
                      <p className="font-semibold">
                        {fmtMoney(
                          data!.finance.income[data!.finance.income.length - 1]
                            ?.netIncome || 0
                        )}
                      </p>
                      <p className="text-[11px] text-muted">Ingreso neto</p>
                    </div>
                  </div>
                )}
              </section>
            )}

            {data?.sec && (
              <section className="bg-card rounded-xl border border-border p-4 mb-4">
                <h2 className="text-sm font-semibold mb-1">Filings y estados SEC EDGAR</h2>
                <p className="text-xs text-muted mb-3">
                  {data.sec.name} · CIK {data.sec.cik} · datos públicos XBRL
                </p>
                {data.sec.filings.length > 0 ? (
                  <ul className="space-y-2">
                    {data.sec.filings.slice(0, 5).map((filing) => {
                      const documentUrl = filing.document
                        ? `https://www.sec.gov/Archives/edgar/data/${Number(data.sec!.cik)}/${filing.accession.replaceAll("-", "")}/${encodeURIComponent(filing.document)}`
                        : `https://www.sec.gov/edgar/browse/?CIK=${encodeURIComponent(data.sec!.cik)}`;
                      return (
                        <li key={`${filing.accession}-${filing.form}`}>
                          <a
                            href={documentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            {filing.form} · {filing.date}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-muted">Filings recientes no disponibles en este momento.</p>
                )}
              </section>
            )}

            {/* Analistas + precio objetivo */}
            {(data?.recommendation || data?.priceTarget) && (
              <section className="bg-card rounded-xl border border-border p-4 mb-4">
                <h2 className="text-sm font-semibold mb-3">
                  Calificaciones de analistas
                </h2>
                {data?.priceTarget &&
                  (data.priceTarget.consensus != null ||
                    data.priceTarget.lastQuarterAvg != null) && (
                    <div className="mb-4">
                      <p className="text-2xl font-bold">
                        {fmt(
                          Number(
                            data.priceTarget.consensus ??
                              data.priceTarget.lastQuarterAvg ??
                              0
                          ),
                          2
                        )}{" "}
                        $
                      </p>
                      <p className="text-xs text-muted">
                        Precio objetivo promedio
                      </p>
                      <p className="text-[11px] text-muted mt-1.5 leading-relaxed">
                        {data.priceTarget.high != null &&
                          data.priceTarget.low != null && (
                            <>
                              Estimación más alta{" "}
                              {fmt(Number(data.priceTarget.high), 2)} $. Más baja{" "}
                              {fmt(Number(data.priceTarget.low), 2)} $.{" "}
                            </>
                          )}
                        {data.priceTarget.lastQuarterCount != null && (
                          <>
                            Basado en ~{data.priceTarget.lastQuarterCount}{" "}
                            objetivos (último trimestre).
                          </>
                        )}{" "}
                        No es una recomendación de inversión.
                      </p>
                      {quote &&
                        (data.priceTarget.consensus != null ||
                          data.priceTarget.lastQuarterAvg != null) && (
                          <p className="text-xs mt-2">
                            vs precio actual:{" "}
                            <span
                              className={
                                Number(
                                  data.priceTarget.consensus ??
                                    data.priceTarget.lastQuarterAvg
                                ) >= quote.price
                                  ? "text-success font-medium"
                                  : "text-danger font-medium"
                              }
                            >
                              {fmtPct(
                                ((Number(
                                  data.priceTarget.consensus ??
                                    data.priceTarget.lastQuarterAvg
                                ) -
                                  quote.price) /
                                  quote.price) *
                                  100
                              )}
                            </span>
                          </p>
                        )}
                    </div>
                  )}
                {data?.recommendation && buyPct != null && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Comprar</span>
                      <span className="text-sm font-semibold">{buyPct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden mb-3">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${buyPct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted leading-relaxed">
                      Strong buy {data.recommendation.strongBuy} · Buy{" "}
                      {data.recommendation.buy} · Hold {data.recommendation.hold}{" "}
                      · Sell{" "}
                      {data.recommendation.sell +
                        data.recommendation.strongSell}
                      .
                    </p>
                  </>
                )}
              </section>
            )}

            {/* Resultados / earnings */}
            {(data?.earnings?.length ?? 0) > 0 && (
              <section className="bg-card rounded-xl border border-border p-4 mb-4">
                <h2 className="text-sm font-semibold mb-3">
                  Resultados financieros (EPS)
                </h2>
                <div className="space-y-2">
                  {data!.earnings.slice(0, 6).map((e) => (
                    <div
                      key={e.period}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted text-xs">
                        {e.year && e.quarter
                          ? `Q${e.quarter} ${e.year}`
                          : e.period}
                      </span>
                      <div className="flex items-center gap-3">
                        {e.estimate != null && (
                          <span className="text-xs text-muted">
                            Est. {e.estimate.toFixed(2)}
                          </span>
                        )}
                        {e.actual != null && (
                          <span className="font-semibold">
                            {e.actual.toFixed(2)}
                          </span>
                        )}
                        {e.surprisePercent != null && (
                          <span
                            className={`text-xs font-medium ${
                              e.surprisePercent >= 0
                                ? "text-success"
                                : "text-danger"
                            }`}
                          >
                            {fmtPct(e.surprisePercent)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            
            {/* FIBRA: yield vs tasa libre de riesgo */}
            {data?.assetType === "fibra" && (
              <section className="bg-card rounded-xl border border-border p-4 mb-4">
                <h2 className="text-sm font-semibold mb-2">
                  Métricas FIBRA / REIT
                </h2>
                {(() => {
                  const meta = getFibraMeta(raw);
                  if (!meta) return null;
                  return (
                    <div className="mb-3 space-y-1.5">
                      <p className="text-xs text-muted">{meta.focus}</p>
                      <p className="text-xs">
                        <span className="text-muted">Tipo de inmueble: </span>
                        <span className="font-medium">
                          {meta.propertyTypes.join(" · ")}
                        </span>
                      </p>
                      <p className="text-xs">
                        <span className="text-muted">Ocupación: </span>
                        <span className="font-medium">
                          {meta.occupancyPct != null
                            ? `${meta.occupancyPct}%`
                            : "N/D en APIs free (ver reporte trimestral)"}
                        </span>
                      </p>
                    </div>
                  );
                })()}
                <p className="text-[11px] text-muted mb-3 leading-relaxed">
                  Yield de distribución vs tasa libre de riesgo MX (aprox.). No
                  sustituye el cap rate de valuación inmobiliaria.
                </p>
                {(() => {
                  let yieldPct: number | null = null;
                  const divs = data?.dividends || [];
                  const price = quote?.price;
                  if (divs.length && price) {
                    const annual =
                      divs.length >= 4
                        ? divs.slice(0, 4).reduce((s, d) => s + d.amount, 0)
                        : divs[0].amount * 4;
                    yieldPct = (annual / price) * 100;
                  }
                  const rf = riskFreeMx;
                  const spread =
                    yieldPct != null && rf != null ? yieldPct - rf : null;
                  return (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-background rounded-lg p-2 border border-border">
                        <p className="text-lg font-bold">
                          {yieldPct != null ? `${yieldPct.toFixed(2)}%` : "—"}
                        </p>
                        <p className="text-[10px] text-muted">Rend. dividendo</p>
                      </div>
                      <div className="bg-background rounded-lg p-2 border border-border">
                        <p className="text-lg font-bold">
                          {rf != null ? `${rf.toFixed(2)}%` : "—"}
                        </p>
                        <p className="text-[10px] text-muted">Tasa libre MX</p>
                      </div>
                      <div className="bg-background rounded-lg p-2 border border-border">
                        <p
                          className={`text-lg font-bold ${
                            spread != null && spread >= 0
                              ? "text-success"
                              : spread != null
                              ? "text-danger"
                              : ""
                          }`}
                        >
                          {spread != null
                            ? `${spread >= 0 ? "+" : ""}${spread.toFixed(2)} pp`
                            : "—"}
                        </p>
                        <p className="text-[10px] text-muted">Diferencial</p>
                      </div>
                    </div>
                  );
                })()}
                <p className="text-[10px] text-muted mt-2">
                  La tasa de capitalización de mercado no está en APIs free; el rendimiento de
                  distribución es el indicador más cercano.
                </p>

                {/* Desglose resultado fiscal vs reembolso de capital */}
                {(() => {
                  const meta = getFibraMeta(raw);
                  const lastAmt = data?.dividends?.[0]?.amount;
                  const split =
                    lastAmt != null
                      ? splitFibraDistribution(Number(lastAmt), meta)
                      : null;
                  return (
                    <div className="mt-4 pt-3 border-t border-border">
                      <h3 className="text-xs font-semibold mb-2">
                        Desglose de distribución (orientativo)
                      </h3>
                      <p className="text-[10px] text-muted mb-3 leading-relaxed">
                        En FIBRAs cada pago suele partirse entre{" "}
                        <strong className="text-foreground font-medium">
                          resultado fiscal
                        </strong>{" "}
                        (base gravable típica) y{" "}
                        <strong className="text-foreground font-medium">
                          reembolso de capital
                        </strong>{" "}
                        (suele no gravarse como dividendo; reduce costo fiscal).
                        Los % exactos salen del aviso del fiduciario; aquí es
                        aproximación educativa.
                      </p>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-background rounded-lg p-2.5 border border-border">
                          <p className="text-[10px] text-muted mb-0.5">
                            Resultado fiscal
                          </p>
                          <p className="text-base font-bold">
                            {split?.fiscalPct != null
                              ? `${split.fiscalPct}%`
                              : "N/D"}
                          </p>
                          {split?.fiscal != null && (
                            <p className="text-[11px] text-muted mt-0.5">
                              ≈ {fmt(split.fiscal, 4)} $ / CBFI
                            </p>
                          )}
                        </div>
                        <div className="bg-background rounded-lg p-2.5 border border-border">
                          <p className="text-[10px] text-muted mb-0.5">
                            Reembolso de capital
                          </p>
                          <p className="text-base font-bold">
                            {split?.capitalPct != null
                              ? `${split.capitalPct}%`
                              : "N/D"}
                          </p>
                          {split?.capital != null && (
                            <p className="text-[11px] text-muted mt-0.5">
                              ≈ {fmt(split.capital, 4)} $ / CBFI
                            </p>
                          )}
                        </div>
                      </div>
                      {split?.fiscalPct != null &&
                        split?.capitalPct != null && (
                          <div className="h-2.5 rounded-full bg-secondary overflow-hidden flex mb-2">
                            <div
                              className="h-full bg-amber-500/90"
                              style={{ width: `${split.fiscalPct}%` }}
                              title="Resultado fiscal"
                            />
                            <div
                              className="h-full bg-sky-500/80"
                              style={{ width: `${split.capitalPct}%` }}
                              title="Reembolso de capital"
                            />
                          </div>
                        )}
                      <div className="flex gap-3 text-[10px] text-muted mb-2">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-sm bg-amber-500/90" />
                          Resultado fiscal
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-sm bg-sky-500/80" />
                          Reembolso de capital
                        </span>
                      </div>
                      {meta?.distributionNote && (
                        <p className="text-[10px] text-muted leading-relaxed">
                          {meta.distributionNote}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </section>
            )}

            {/* Dividendos / distribuciones */}
            {(data?.dividends?.length ?? 0) > 0 && (
              <section className="bg-card rounded-xl border border-border p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold">
                    {data?.assetType === "fibra"
                      ? "Distribuciones"
                      : "Dividendos"}
                  </h2>
                  <Link
                    href={`/dividends?symbol=${encodeURIComponent(raw)}`}
                    className="text-xs text-primary font-medium"
                  >
                    Ver más
                  </Link>
                </div>
                {data?.stats?.divYield != null && (
                  <p className="text-2xl font-bold mb-3">
                    {fmt(Number(data.stats.divYield), 2)}%{" "}
                    <span className="text-xs font-normal text-muted">
                      rentabilidad
                    </span>
                  </p>
                )}
                <div className="space-y-3">
                  {(data?.dividends || []).slice(0, 6).map((d, i) => {
                    const maxAmt = Math.max(
                      ...(data?.dividends || []).map((x) => x.amount),
                      0.01
                    );
                    const pct = Math.min(100, (d.amount / maxAmt) * 100);
                    const isFibra = data?.assetType === "fibra";
                    const meta = isFibra ? getFibraMeta(raw) : null;
                    const split = isFibra
                      ? splitFibraDistribution(Number(d.amount), meta)
                      : null;
                    return (
                      <div key={d.date + i} className="text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted w-16 flex-shrink-0 text-xs">
                            {d.date.slice(0, 7)}
                          </span>
                          <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full rounded-full bg-amber-500/80"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="font-medium w-16 text-right text-xs">
                            {fmt(d.amount, 2)} $
                          </span>
                        </div>
                        {isFibra &&
                          split?.fiscal != null &&
                          split?.capital != null && (
                            <div className="mt-1 ml-16 pr-16 grid grid-cols-2 gap-1 text-[10px]">
                              <span className="text-muted">
                                Res. fiscal ≈{" "}
                                <span className="text-foreground font-medium">
                                  {fmt(split.fiscal, 4)} $
                                </span>
                                {split.fiscalPct != null
                                  ? ` (${split.fiscalPct}%)`
                                  : ""}
                              </span>
                              <span className="text-muted text-right">
                                Reemb. cap. ≈{" "}
                                <span className="text-foreground font-medium">
                                  {fmt(split.capital, 4)} $
                                </span>
                                {split.capitalPct != null
                                  ? ` (${split.capitalPct}%)`
                                  : ""}
                              </span>
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>
                {data?.assetType === "fibra" && (
                  <p className="text-[10px] text-muted mt-3 leading-relaxed">
                    Montos por CBFI. Confirma el desglose oficial en el aviso de
                    distribución de la FIBRA (BMV/BIVA o fiduciario).
                  </p>
                )}
              </section>
            )}

            {/* Estadísticas */}
            <section className="bg-card rounded-xl border border-border p-4 mb-4">
              <h2 className="text-sm font-semibold mb-3">Estadísticas</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted">Rango diario</span>
                  <span className="font-medium">
                    {(quote?.low ?? data?.stats?.dayLow) != null
                      ? fmt(Number(quote?.low ?? data?.stats?.dayLow))
                      : "—"}{" "}
                    –{" "}
                    {(quote?.high ?? data?.stats?.dayHigh) != null
                      ? fmt(Number(quote?.high ?? data?.stats?.dayHigh))
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted">Rango 52S</span>
                  <span className="font-medium">
                    {data?.stats?.low52 != null
                      ? fmt(Number(data.stats.low52))
                      : "—"}{" "}
                    –{" "}
                    {data?.stats?.high52 != null
                      ? fmt(Number(data.stats.high52))
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted">Volumen</span>
                  <span className="font-medium">
                    {quote?.volume != null
                      ? `${(quote.volume / 1e6).toFixed(2)}M`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted">Vol. promedio</span>
                  <span className="font-medium">
                    {data?.stats?.avgVolume != null
                      ? `${Number(data.stats.avgVolume).toFixed(1)}M`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted">Relación P/E</span>
                  <span className="font-medium">
                    {data?.stats?.pe != null
                      ? fmt(Number(data.stats.pe), 2)
                      : "—"}
                  </span>
                </div>
                {data?.stats?.pb != null && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted">Relación P/B</span>
                    <span className="font-medium">{fmt(Number(data.stats.pb), 2)}</span>
                  </div>
                )}
                {data?.stats?.ps != null && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted">Relación P/S</span>
                    <span className="font-medium">{fmt(Number(data.stats.ps), 2)}</span>
                  </div>
                )}
                {data?.stats?.roe != null && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted">ROE</span>
                    <span className="font-medium">{fmt(Number(data.stats.roe), 2)}%</span>
                  </div>
                )}
                {data?.stats?.roa != null && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted">ROA</span>
                    <span className="font-medium">{fmt(Number(data.stats.roa), 2)}%</span>
                  </div>
                )}
                {data?.stats?.roi != null && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted">ROI</span>
                    <span className="font-medium">{fmt(Number(data.stats.roi), 2)}%</span>
                  </div>
                )}
                {data?.stats?.currentRatio != null && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted">Razón corriente</span>
                    <span className="font-medium">{fmt(Number(data.stats.currentRatio), 2)}</span>
                  </div>
                )}
                {data?.stats?.debtEquity != null && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted">Deuda / patrimonio</span>
                    <span className="font-medium">{fmt(Number(data.stats.debtEquity), 2)}</span>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <span className="text-muted">Cap. bursátil</span>
                  <span className="font-medium">
                    {fmtBig(
                      data?.stats?.marketCap != null
                        ? Number(data.stats.marketCap)
                        : null
                    )}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted">Rend. dividendo</span>
                  <span className="font-medium">
                    {data?.stats?.divYield != null
                      ? `${fmt(Number(data.stats.divYield), 2)}%`
                      : "—"}
                  </span>
                </div>
                {(data?.assetType === "etf" ||
                  String(raw || "").toUpperCase().match(
                    /^(SPY|QQQ|VOO|VTI|IVV|SCHD|VYM|VIG|IWM|DIA|GLD|SLV|HYG|LQD|BND|AGG|EFA|EEM)/
                  ) ||
                  data?.stats?.expenseRatio != null) && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted">Gastos administrativos</span>
                    <span className="font-medium">
                      {data?.stats?.expenseRatio != null
                        ? `${fmt(Number(data.stats.expenseRatio), 3)}%`
                        : "—"}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted mt-3 leading-relaxed">
                Si un dato sale “—” la API gratis no lo publicó para este
                ticker (muy común en P/E y capitalización de ETFS y emisoras
                MX). El yield se estima con los dividendos recientes si no
                viene directo.
              </p>
              <p className="text-[10px] text-muted mt-2">
                Fuentes: {Object.entries(data?.dataSources || {})
                  .filter((entry): entry is [string, string] => Boolean(entry[1]))
                  .map(([key, source]) => `${key}: ${source}`)
                  .join(" · ") || "sin datos confirmados"}
              </p>
            </section>

            <TaxSharesPanel
              symbol={raw}
              assetType={data?.assetType}
              lastDivAmount={data?.dividends?.[0]?.amount}
              divCurrency={quote?.currency}
              price={quote?.price}
              priceCurrency={quote?.currency}
              divYieldPct={
                data?.stats?.divYield != null
                  ? Number(data.stats.divYield)
                  : null
              }
              usdMxn={usdMxn}
            />

            {/* Empresa */}
            {(data?.profile || quote) && (
              <section className="bg-card rounded-xl border border-border p-4 mb-4">
                <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
                  {data?.assetType === "fibra"
                    ? "FIBRA"
                    : data?.assetType === "etf"
                    ? "ETF"
                    : "Empresa"}
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted">Nombre</span>
                    <span className="font-medium text-right">{name}</span>
                  </div>
                  {data?.profile?.industry && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted">Sector</span>
                      <span className="font-medium text-right">
                        {data.profile.industry}
                      </span>
                    </div>
                  )}
                  {(data?.profile?.exchange || quote?.market) && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted">Bolsa</span>
                      <span className="font-medium text-right">
                        {data?.profile?.exchange || quote?.market}
                      </span>
                    </div>
                  )}
                </div>
              </section>
            )}

            <p className="text-[11px] text-muted text-center leading-relaxed">
              Datos: Finnhub, FMP, Yahoo y DataBursatil según el símbolo. Pueden
              tener retraso. No es asesoramiento financiero.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
