"use client";
import { loadPositions } from "@/lib/persist";

import { PortfolioEvents } from "@/components/PortfolioEvents";

import { useState, useEffect, useMemo, useCallback } from "react";

type CalendarEvent = {
  id: string;
  date: string;
  symbol?: string;
  title: string;
  type: "earnings" | "dividend" | "ipo" | "market" | "delisting";
  region: "US" | "MX" | "GLOBAL";
  detail?: string;
  source: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDay(iso: string) {
  try {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("es-MX", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}

const TYPE_META: Record<
  CalendarEvent["type"],
  { label: string; color: string; icon: string }
> = {
  earnings: {
    label: "Resultados",
    color: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    icon: "📊",
  },
  dividend: {
    label: "Dividendo",
    color: "bg-green-500/15 text-green-600 dark:text-green-400",
    icon: "💰",
  },
  ipo: {
    label: "Ofertas públicas",
    color: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
    icon: "🚀",
  },
  market: {
    label: "Mercado",
    color: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
    icon: "🏛️",
  },
  delisting: {
    label: "Desliste",
    color: "bg-red-500/15 text-red-600 dark:text-red-400",
    icon: "⛔",
  },
};

export default function CalendarPage() {
  const [holdingSymbols, setHoldingSymbols] = useState<string[]>([]);
  const [onlyHoldings, setOnlyHoldings] = useState(true);
  useEffect(() => {
    try {
      const raw = JSON.stringify(loadPositions());
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          setHoldingSymbols(
            arr
              .map((p: { symbol?: string }) => p.symbol)
              .filter((s): s is string => Boolean(s))
          );
        }
      }
    } catch { /* */ }
  }, []);

  const [from] = useState(todayISO());
  const [to] = useState(addDays(todayISO(), 21));
  const [filter, setFilter] = useState<
    "all" | "earnings" | "dividend" | "ipo" | "delisting"
  >("all");
  const [region, setRegion] = useState<"ALL" | "US" | "MX">("ALL");
  const [search, setSearch] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/calendar?from=${from}&to=${to}&type=${filter === "all" ? "all" : filter}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEvents(data.events || []);
      setSources(data.sources || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [from, to, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (region === "US" && e.region !== "US") return false;
      if (region === "MX" && e.region !== "MX") return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !e.title.toLowerCase().includes(q) &&
          !(e.symbol || "").toLowerCase().includes(q) &&
          !(e.detail || "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [events, region, search]);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of filtered) {
      const list = map.get(e.date) || [];
      list.push(e);
      map.set(e.date, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border safe-top">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Calendario</h1>
            {sources.length > 0 && (
              <span className="text-[10px] font-medium bg-success/15 text-success px-2 py-0.5 rounded-full">
                EN VIVO
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

      {/* placeholder */}
      <main className="flex-1 max-w-lg mx-auto w-full">
        <div className="max-w-lg mx-auto w-full px-4 pt-3 space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyHoldings}
              onChange={(e) => setOnlyHoldings(e.target.checked)}
            />
            Solo lo que poseo
          </label>
          {onlyHoldings && (
            <PortfolioEvents symbols={holdingSymbols} limit={15} title="Eventos de mi cartera" />
          )}
        </div>

        {/* Rango */}
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs text-muted">
            {formatDay(from)} → {formatDay(to)} · {filtered.length} eventos
          </p>
        </div>

        {/* Tipos */}
        <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
          {(
            [
              { key: "all", label: "Todos" },
              { key: "earnings", label: "📊 Resultados" },
              { key: "dividend", label: "💰 Dividendos" },
              { key: "ipo", label: "🚀 Ofertas" },
              { key: "delisting", label: "⛔ Desliste" },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
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

        {/* Región + búsqueda */}
        <div className="px-4 pb-3 space-y-2">
          <div className="flex gap-2">
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
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">
              🔍
            </span>
            <input
              type="search"
              placeholder="Buscar símbolo o evento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card border border-border rounded-xl py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="px-4 pb-8">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-20 bg-card rounded-xl border border-border animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <p className="text-center text-danger py-10 text-sm">{error}</p>
          ) : byDate.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">📅</p>
              <p className="font-medium">Sin eventos</p>
              <p className="text-sm text-muted mt-1">
                Prueba otro filtro o rango
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {byDate.map(([date, dayEvents]) => (
                <section key={date}>
                  <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
                    {formatDay(date)}
                  </h2>
                  <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
                    {dayEvents.map((e) => {
                      const meta = TYPE_META[e.type];
                      return (
                        <div
                          key={e.id}
                          className="flex items-start gap-3 px-4 py-3"
                        >
                          <span className="text-lg flex-shrink-0 mt-0.5">
                            {meta.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm truncate">
                                {e.title}
                              </p>
                              <span
                                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${meta.color}`}
                              >
                                {meta.label}
                              </span>
                            </div>
                            {e.detail && (
                              <p className="text-xs text-muted mt-0.5">
                                {e.detail}
                              </p>
                            )}
                            {e.symbol && (
                              <p className="text-[11px] text-muted mt-0.5">
                                {e.symbol} · {e.region}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}

          <p className="text-[11px] text-muted text-center mt-6 leading-relaxed">
            Resultados y ofertas: Finnhub · Dividendos: FMP · Próximos 21 días.
            Eventos de México de mercado son de referencia.
          </p>
        </div>
      </main>
    </div>
  );
}
