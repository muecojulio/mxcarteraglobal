"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Ev = {
  id: string;
  date: string;
  symbol: string;
  type: "dividend" | "earnings" | "split";
  title: string;
  detail?: string;
  amount?: number | null;
};

/** Constante de módulo para no recrear el array en cada render. */
const EMPTY_EVENTS: Ev[] = [];

const TYPE_LABEL: Record<string, string> = {
  dividend: "Dividendo",
  earnings: "Resultados",
  split: "Split",
};

const TYPE_COLOR: Record<string, string> = {
  dividend: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  earnings: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  split: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
};

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function PortfolioEvents({
  symbols,
  limit = 12,
  title = "¿Qué cobro pronto?",
  defaultFilter = "dividend" as "all" | "dividend" | "earnings" | "split",
}: {
  symbols: string[];
  limit?: number;
  title?: string;
  defaultFilter?: "all" | "dividend" | "earnings" | "split";
}) {
  const [eventsRaw, setEvents] = useState<Ev[]>([]);
  const [filter, setFilter] = useState<"all" | "dividend" | "earnings" | "split">(
    defaultFilter
  );
  const [onlyThisMonth, setOnlyThisMonth] = useState(true);

  // `loading` y `events` se derivan de para qué lista de símbolos terminó la
  // carga, en vez de setearse en síncrono dentro del effect.
  const symbolsKey = symbols.join(",");
  const [settledFor, setSettledFor] = useState<string | null>(null);
  const loading = symbolsKey !== "" && settledFor !== symbolsKey;
  const events = symbolsKey === "" ? EMPTY_EVENTS : eventsRaw;

  useEffect(() => {
    if (!symbols.length) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/portfolio-events?symbols=${encodeURIComponent(
            symbols.join(",")
          )}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setEvents(data.events || []);
      } catch {
        /* */
      } finally {
        if (!cancelled) setSettledFor(symbolsKey);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey]);

  const thisMonth = monthKey(new Date());

  const filtered = useMemo(() => {
    let list = filter === "all" ? events : events.filter((e) => e.type === filter);
    if (onlyThisMonth) {
      list = list.filter((e) => (e.date || "").slice(0, 7) === thisMonth);
    }
    return list;
  }, [events, filter, onlyThisMonth, thisMonth]);

  const shown = filtered.slice(0, limit);

  const monthDivEstimate = useMemo(() => {
    return events
      .filter(
        (e) =>
          e.type === "dividend" &&
          (e.date || "").slice(0, 7) === thisMonth &&
          e.amount != null
      )
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  }, [events, thisMonth]);

  if (!symbols.length) return null;

  return (
    <section className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        {loading && <span className="text-[10px] text-muted">…</span>}
      </div>
      <p className="text-[10px] text-muted mb-3 leading-relaxed">
        Dividendos y distribuciones de lo que sigues o tienes. Montos por
        título cuando la API los trae; en la cartera multiplica por tus
        acciones/CBFI. Preferimos mostrar todo orientado a{" "}
        <span className="text-foreground font-medium">pesos (MXN)</span> en el
        resto de la app.
      </p>

      <div className="flex gap-1.5 mb-2 overflow-x-auto no-scrollbar">
        {(
          [
            ["dividend", "Cobros"],
            ["all", "Todos"],
            ["earnings", "Resultados"],
            ["split", "Splits"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 ${
              filter === k
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOnlyThisMonth((v) => !v)}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 ${
            onlyThisMonth
              ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
              : "bg-secondary text-muted"
          }`}
        >
          {onlyThisMonth ? "Este mes" : "90 días"}
        </button>
      </div>

      {filter === "dividend" && monthDivEstimate > 0 && (
        <p className="text-xs mb-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5">
          Suma orientativa de montos unitarios este mes:{" "}
          <span className="font-semibold">
            {monthDivEstimate.toFixed(4)}
          </span>{" "}
          (por acción/CBFI reportado; no es tu cobro total)
        </p>
      )}

      {shown.length === 0 ? (
        <p className="text-xs text-muted leading-relaxed">
          {loading
            ? "Buscando cobros y eventos…"
            : onlyThisMonth
            ? "No hay cobros listados para este mes en las APIs free. Prueba “90 días” o revisa la ficha de cada título."
            : "No hay dividendos, resultados o splits próximos (90 días) para tus símbolos en las APIs free. MX suele tener menos cobertura."}
        </p>
      ) : (
        <div className="space-y-2">
          {shown.map((e) => (
            <Link
              key={e.id}
              href={`/asset/${encodeURIComponent(e.symbol)}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      TYPE_COLOR[e.type] || ""
                    }`}
                  >
                    {TYPE_LABEL[e.type] || e.type}
                  </span>
                  <span className="font-semibold text-sm">{e.symbol}</span>
                </div>
                <p className="text-[11px] text-muted truncate">
                  {e.date}
                  {e.detail ? ` · ${e.detail}` : ""}
                </p>
              </div>
              {e.amount != null && (
                <span className="text-xs font-medium shrink-0">
                  {Number(e.amount).toFixed(4)}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
