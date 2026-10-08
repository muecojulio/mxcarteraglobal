"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuotes, useDividends } from "@/lib/market-data/client";
import { useUsdMxn, toMxn, formatMxn } from "@/lib/fx";

const FEATURED = [
  { symbol: "AAPL", name: "Apple Inc.", region: "US" as const },
  { symbol: "MSFT", name: "Microsoft", region: "US" as const },
  { symbol: "JNJ", name: "Johnson & Johnson", region: "US" as const },
  { symbol: "KO", name: "Coca-Cola", region: "US" as const },
  { symbol: "O", name: "Realty Income", region: "US" as const },
  { symbol: "DIV", name: "Global X SuperDividend ETF", region: "US" as const },
  { symbol: "SCHD", name: "Schwab US Dividend Equity ETF", region: "US" as const },
  { symbol: "AMXL.MX", name: "América Móvil", region: "MX" as const },
  { symbol: "WALMEX.MX", name: "Walmart México", region: "MX" as const },
  { symbol: "GFNORTEO.MX", name: "Banorte", region: "MX" as const },
  { symbol: "FEMSAUBD.MX", name: "FEMSA", region: "MX" as const },
  { symbol: "BIMBOA.MX", name: "Grupo Bimbo", region: "MX" as const },
];

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency === "MXN" ? "MXN" : "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function moneyMxn(
  value: number,
  fromCurrency: string | undefined,
  usdMxn: number | null
) {
  return formatMxn(toMxn(value, fromCurrency || "USD", usdMxn), 4);
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso.includes("T") ? iso : iso + "T12:00:00");
    return d.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function DividendsPage() {
  const [filter, setFilter] = useState<"ALL" | "MX" | "US">("ALL");
  const [selected, setSelected] = useState<string | null>("AAPL");
  const [customSymbol, setCustomSymbol] = useState("");
  const { fx } = useUsdMxn(120_000);
  const usdMxn = fx?.usdMxn ?? null;

  const symbols = useMemo(() => FEATURED.map((f) => f.symbol), []);
  const { data: quotesData, loading: quotesLoading } = useQuotes(symbols, 90_000);
  const quotesMap = useMemo(() => {
    const m = new Map<string, number>();
    (quotesData?.quotes ?? []).forEach((q) =>
      m.set(q.symbol.toUpperCase(), q.price)
    );
    return m;
  }, [quotesData]);

  const { data: divData, loading: divLoading, error: divError } =
    useDividends(selected);

  const filteredFeatured = FEATURED.filter((f) => {
    if (filter === "MX") return f.region === "MX";
    if (filter === "US") return f.region === "US";
    return true;
  });

  const activeMeta = FEATURED.find(
    (f) => f.symbol.toUpperCase() === selected?.toUpperCase()
  ) || { symbol: selected || "", name: selected || "", region: "US" as const };

  const livePrice = selected
    ? quotesMap.get(selected.toUpperCase())
    : undefined;

  const dividends = divData?.dividends ?? [];
  const annualEstimate =
    dividends.length >= 4
      ? dividends.slice(0, 4).reduce((s, d) => s + d.amount, 0)
      : dividends.length > 0
      ? dividends[0].amount * 4
      : 0;
  const yieldApprox =
    livePrice && livePrice > 0 && annualEstimate > 0
      ? (annualEstimate / livePrice) * 100
      : null;
  const perShareQuarterly = annualEstimate / 4;
  const perShareMonthly = annualEstimate / 12;
  const perShareWeekly = annualEstimate / 52;
  const perShareDaily = annualEstimate / 365;
  const perShareHourly = annualEstimate / (365 * 24);

  const handleSelectCustom = () => {
    const s = customSymbol.trim().toUpperCase();
    if (s) setSelected(s);
  };

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border safe-top">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Dividendos</h1>
            <Link
              href="/dividends/analysis"
              className="text-xs font-medium text-primary px-2.5 py-1.5 rounded-lg border border-border ml-2"
            >
              Análisis
            </Link>
            {divData?.usingRealData && (
              <span className="text-[10px] font-medium bg-success/15 text-success px-2 py-0.5 rounded-full">
                REALES
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full">
        {/* Filtros */}
        <div className="px-4 pt-4 pb-2 flex gap-2">
          {[
            { key: "ALL", label: "Todos" },
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

        {/* Lista de acciones */}
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            {filteredFeatured.map((f) => (
              <button
                key={f.symbol}
                onClick={() => setSelected(f.symbol)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  selected?.toUpperCase() === f.symbol.toUpperCase()
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-foreground"
                }`}
              >
                {f.symbol.replace(".MX", "")}
              </button>
            ))}
          </div>
        </div>

        {/* Buscar otro símbolo */}
        <div className="px-4 pb-3 flex gap-2">
          <input
            type="text"
            placeholder="Otro símbolo (ej. PG, KO, AMXL.MX)"
            value={customSymbol}
            onChange={(e) => setCustomSymbol(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSelectCustom()}
            className="flex-1 bg-card border border-border rounded-xl py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            onClick={handleSelectCustom}
            className="px-4 rounded-xl bg-secondary text-sm font-medium"
          >
            Ver
          </button>
        </div>

        {/* Detalle del seleccionado */}
        {selected && (
          <div className="px-4 pb-8 space-y-4">
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-lg">{selected}</p>
                  <p className="text-sm text-muted">{activeMeta.name}</p>
                  <p className="text-xs text-muted mt-1">
                    Fuente:{" "}
                    {divData?.source === "databursatil"
                      ? "DataBursatil (MX)"
                      : divData?.source === "fmp"
                      ? "FMP (EE.UU.)"
                      : "—"}
                  </p>
                </div>
                <div className="text-right">
                  {livePrice != null ? (
                    <>
                      <p className="font-semibold">
                        {moneyMxn(livePrice, activeMeta.region === "MX" ? "MXN" : "USD", usdMxn)}
                      </p>
                      <p className="text-[10px] text-muted">precio actual</p>
                    </>
                  ) : quotesLoading ? (
                    <p className="text-sm text-muted animate-pulse">…</p>
                  ) : null}
                  {yieldApprox != null && (
                    <p className="text-sm font-medium text-success mt-1">
                      ~{yieldApprox.toFixed(2)}% yield
                    </p>
                  )}
                </div>
              </div>
            </div>


            {annualEstimate > 0 && (
              <div className="bg-card rounded-2xl border border-border p-4">
                <p className="text-xs text-muted mb-1">Dividendo estimado (por acción)</p>
                <p className="text-xl font-bold">
                  {moneyMxn(annualEstimate, activeMeta.region === "MX" ? "MXN" : "USD", usdMxn)}
                  <span className="text-sm font-normal text-muted"> / año</span>
                </p>
                <div className="grid grid-cols-2 gap-2 mt-3 text-center">
                  <div className="rounded-xl bg-secondary/80 p-2.5">
                    <p className="font-semibold text-sm">
                      {moneyMxn(perShareQuarterly, activeMeta.region === "MX" ? "MXN" : "USD", usdMxn)}
                    </p>
                    <p className="text-[10px] text-muted">Trimestral</p>
                  </div>
                  <div className="rounded-xl bg-secondary/80 p-2.5">
                    <p className="font-semibold text-sm">
                      {moneyMxn(perShareMonthly, activeMeta.region === "MX" ? "MXN" : "USD", usdMxn)}
                    </p>
                    <p className="text-[10px] text-muted">Mensual</p>
                  </div>
                  <div className="rounded-xl bg-secondary/80 p-2.5">
                    <p className="font-semibold text-sm">
                      {moneyMxn(perShareWeekly, activeMeta.region === "MX" ? "MXN" : "USD", usdMxn)}
                    </p>
                    <p className="text-[10px] text-muted">Semanal</p>
                  </div>
                  <div className="rounded-xl bg-secondary/80 p-2.5">
                    <p className="font-semibold text-sm">
                      {moneyMxn(perShareDaily, activeMeta.region === "MX" ? "MXN" : "USD", usdMxn)}
                    </p>
                    <p className="text-[10px] text-muted">Diario</p>
                  </div>
                  <div className="rounded-xl bg-secondary/80 p-2.5">
                    <p className="font-semibold text-sm">
                      {moneyMxn(perShareHourly, activeMeta.region === "MX" ? "MXN" : "USD", usdMxn)}
                    </p>
                    <p className="text-[10px] text-muted">Por hora</p>
                  </div>
                </div>
                <p className="text-[10px] text-muted mt-2 leading-relaxed">
                  Montos en pesos mexicanos. Promedios a partir del dividendo anual estimado
                  por acción (historial × 4 pagos típicos).
                </p>
              </div>
            )}

            <div>
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2 px-1">
                Historial de dividendos
              </h2>

              {divLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-14 bg-card rounded-xl border border-border animate-pulse"
                    />
                  ))}
                </div>
              ) : divError ? (
                <p className="text-sm text-danger text-center py-6">{divError}</p>
              ) : dividends.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-3xl mb-2">💰</p>
                  <p className="font-medium">Sin dividendos encontrados</p>
                  <p className="text-sm text-muted mt-1">
                    Prueba otro símbolo o revisa la cobertura de la API
                  </p>
                </div>
              ) : (
                <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
                  {dividends.slice(0, 30).map((d, i) => (
                    <div
                      key={`${d.date}-${i}`}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {formatDate(d.date)}
                        </p>
                        <p className="text-[11px] text-muted">
                          {d.paymentDate
                            ? `Pago: ${formatDate(d.paymentDate)}`
                            : d.exDate
                            ? `Ex: ${formatDate(d.exDate)}`
                            : d.frequency || d.type || ""}
                        </p>
                      </div>
                      <p className="font-semibold text-success text-sm">
                        {moneyMxn(d.amount, d.currency || (activeMeta.region === "MX" ? "MXN" : "USD"), usdMxn)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {dividends.length > 30 && (
                <p className="text-xs text-muted text-center mt-2">
                  Mostrando 30 de {dividends.length} registros
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
