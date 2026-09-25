"use client";
import { useEffect, useMemo, useState } from "react";
import { loadPositions } from "@/lib/persist";
import { PortfolioEvents } from "@/components/PortfolioEvents";
type CalendarEvent = { id: string; date: string; symbol?: string; title: string; type: "earnings" | "dividend" | "ipo" | "market"; region: "US" | "MX" | "GLOBAL"; detail?: string };
const META: Record<CalendarEvent["type"], { label: string }> = { earnings: { label: "Resultados" }, dividend: { label: "Dividendo" }, ipo: { label: "IPO" }, market: { label: "Mercado" } };
export default function CalendarPage() {
  const [holdingSymbols, setHoldingSymbols] = useState<string[]>([]);
  const [onlyHoldings, setOnlyHoldings] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { setHoldingSymbols(loadPositions().map((p) => p.symbol.toUpperCase())); }, []);
  useEffect(() => {
    let cancel = false;
    setLoading(true);
    fetch("/api/calendar").then(async (r) => (r.ok ? r.json() : { events: [] })).then((j) => { if (!cancel) setEvents(j.events || []); }).catch(() => { if (!cancel) setEvents([]); }).finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, []);
  const shown = useMemo(() => onlyHoldings && holdingSymbols.length ? events.filter((e) => e.symbol && holdingSymbols.includes(e.symbol.toUpperCase())) : events, [events, onlyHoldings, holdingSymbols]);
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <h1 className="text-lg font-bold">Calendario</h1>
          <button type="button" className="ui-switch" role="switch" aria-checked={onlyHoldings} onClick={() => setOnlyHoldings((v) => !v)}>
            <span className="ui-switch-track"><span className="ui-switch-thumb" /></span>
          </button>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        <PortfolioEvents symbols={holdingSymbols} />
        <p className="text-xs text-muted">Solo tus posiciones: {onlyHoldings ? "sí" : "no"}. Datos de terceros.</p>
        {loading ? <p className="text-sm text-muted">Cargando…</p> : shown.length === 0 ? <p className="text-sm text-muted">Sin eventos en este filtro.</p> : shown.map((e) => (
          <article key={e.id} className="bg-card border border-border rounded-xl p-3">
            <p className="text-xs text-muted">{e.date} · {META[e.type].label}</p>
            <p className="font-semibold text-sm">{e.symbol ? `${e.symbol} · ` : ""}{e.title}</p>
            {e.detail ? <p className="text-xs text-muted mt-1">{e.detail}</p> : null}
          </article>
        ))}
      </main>
    </div>
  );
}
