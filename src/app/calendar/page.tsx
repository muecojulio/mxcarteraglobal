"use client";
import { loadPositions } from "@/lib/persist";
import { PortfolioEvents } from "@/components/PortfolioEvents";
import { ScrollableChips } from "@/components/ui/ScrollableChips";
import { useCallback, useEffect, useMemo, useState } from "react";
type CalendarEvent = { id: string; date: string; symbol?: string; title: string; type: "earnings" | "dividend" | "ipo" | "market" | "delisting"; region: "US" | "MX" | "GLOBAL"; detail?: string; source: string };
const TYPE_META: Record<CalendarEvent["type"], { label: string; icon: string }> = {
  earnings: { label: "Resultados", icon: "📊" },
  dividend: { label: "Dividendo", icon: "💰" },
  ipo: { label: "Ofertas públicas", icon: "🚀" },
  market: { label: "Mercado", icon: "🏛️" },
  delisting: { label: "Desliste", icon: "⛔" },
};
function todayISO() { return new Date().toISOString().slice(0, 10); }
function addDays(iso: string, days: number) { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }
function formatDay(iso: string) { try { return new Date(iso + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" }); } catch { return iso; } }
export default function CalendarPage() {
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(addDays(todayISO(), 21));
  const [filter, setFilter] = useState<"all" | CalendarEvent["type"]>("all");
  const [region, setRegion] = useState<"ALL" | "US" | "MX">("ALL");
  const [search, setSearch] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [onlyHoldings, setOnlyHoldings] = useState(true);
  const holdingSymbols = useMemo(() => loadPositions().map((p) => p.symbol), []);
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch(`/api/calendar?from=${from}&to=${to}&type=${filter}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch { setEvents([]); setLoadError("No se pudieron cargar los eventos. Intenta consultar de nuevo."); }
    finally { setLoading(false); }
  }, [from, to, filter]);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => { void load(); });
    return () => window.cancelAnimationFrame(frame);
  }, [load]);
  const visible = events.filter((ev) => {
    if (region !== "ALL" && ev.region !== region && ev.region !== "GLOBAL") return false;
    if (filter !== "all" && ev.type !== filter) return false;
    if (search && !(`${ev.symbol || ""} ${ev.title}`).toUpperCase().includes(search.toUpperCase())) return false;
    if (onlyHoldings && ev.symbol && !holdingSymbols.some((s) => s.toUpperCase() === ev.symbol!.toUpperCase())) return false;
    return true;
  });
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto"><h1 className="text-lg font-bold">Calendario</h1></div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        <div className="flex gap-2">
          <label className="min-w-0 flex-1 text-xs font-medium" htmlFor="calendar-from">Desde
            <input id="calendar-from" className="ui-input mt-1" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="min-w-0 flex-1 text-xs font-medium" htmlFor="calendar-to">Hasta
            <input id="calendar-to" className="ui-input mt-1" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <label className="sr-only" htmlFor="calendar-search">Buscar eventos por ticker o nombre</label>
        <input id="calendar-search" className="ui-input" placeholder="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} />
        <ScrollableChips
          label="Filtrar calendario por tipo de evento"
          options={(["all", "earnings", "dividend", "ipo", "delisting"] as const).map((item) => ({ value: item, label: item === "all" ? "Todos" : TYPE_META[item].label }))}
          value={filter}
          onChange={setFilter}
        />
        <ScrollableChips
          label="Filtrar calendario por mercado"
          options={(["ALL", "US", "MX"] as const).map((item) => ({ value: item, label: item === "ALL" ? "Todos" : item === "US" ? "EE.UU." : "México" }))}
          value={region}
          onChange={setRegion}
        />
        <button type="button" className={`ui-chip${onlyHoldings ? " ui-chip-active" : ""}`} aria-pressed={onlyHoldings} onClick={() => setOnlyHoldings((v) => !v)}>Solo cartera</button>
        <button type="button" className="ui-btn ui-btn-primary w-full" disabled={loading} aria-busy={loading} onClick={() => void load()}>
          {loading ? "Consultando…" : "Consultar"}
        </button>
        {loadError ? <p className="text-danger text-sm" role="alert">{loadError}</p> : null}
        <PortfolioEvents symbols={holdingSymbols} />
        {visible.map((ev) => (
          <div key={ev.id} className="bg-card border border-border rounded-xl p-3">
            <p className="text-xs text-muted">{TYPE_META[ev.type].icon} {formatDay(ev.date)} · {TYPE_META[ev.type].label} · {ev.region}</p>
            <p className="text-sm font-medium">{ev.symbol ? `${ev.symbol} · ` : ""}{ev.title}</p>
          </div>
        ))}
        {!loading && !loadError && visible.length === 0 ? <p className="text-xs text-muted">Sin eventos en el rango (la API del ZIP puede devolver lista vacía).</p> : null}
      </main>
    </div>
  );
}
