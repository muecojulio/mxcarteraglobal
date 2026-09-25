"use client";
import { loadPositions } from "@/lib/persist";
import { PortfolioEvents } from "@/components/PortfolioEvents";
import { useCallback, useEffect, useMemo, useState } from "react";
type CalendarEvent = { id: string; date: string; symbol?: string; title: string; type: "earnings" | "dividend" | "ipo" | "market" | "delisting"; region: "US" | "MX" | "GLOBAL"; detail?: string; source: string };
function todayISO() { return new Date().toISOString().slice(0, 10); }
function addDays(iso: string, days: number) { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }
function formatDay(iso: string) { try { return new Date(iso + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" }); } catch { return iso; } }
export default function CalendarPage() {
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(addDays(todayISO(), 14));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const symbols = useMemo(() => loadPositions().map((p) => p.symbol), []);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar?from=${from}&to=${to}`);
      const data = await res.json();
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch { setEvents([]); }
    finally { setLoading(false); }
  }, [from, to]);
  useEffect(() => { void load(); }, [load]);
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto"><h1 className="text-lg font-bold">Calendario</h1></div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        <div className="flex gap-2"><input className="ui-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /><input className="ui-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <button type="button" className="ui-btn ui-btn-primary w-full" onClick={() => void load()}>{loading ? "Cargando…" : "Consultar"}</button>
        <PortfolioEvents symbols={symbols} />
        {events.map((ev) => (
          <div key={ev.id} className="bg-card border border-border rounded-xl p-3">
            <p className="text-xs text-muted">{formatDay(ev.date)} · {ev.type} · {ev.region}</p>
            <p className="text-sm font-medium">{ev.symbol ? `${ev.symbol} · ` : ""}{ev.title}</p>
            {ev.detail ? <p className="text-xs text-muted">{ev.detail}</p> : null}
          </div>
        ))}
      </main>
    </div>
  );
}
