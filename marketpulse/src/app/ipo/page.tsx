"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useUsdMxn, formatMxn } from "@/lib/fx";
type IpoItem = { date: string; symbol?: string; name: string; exchange?: string; price?: string; status?: string; numberOfShares?: number; totalSharesValue?: number };
const STATUS_LABEL: Record<string, string> = { expected: "Esperado", filed: "Registrado", priced: "Precio fijado", withdrawn: "Retirado" };
function formatDay(iso: string) { try { return new Date(iso + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", year: "numeric" }); } catch { return iso; } }
function formatIpoPriceMxn(price?: string, usdMxn?: number | null) {
  if (!price) return null;
  const rate = usdMxn && usdMxn > 0 ? usdMxn : 17.5;
  const range = String(price).trim().match(/^\$?\s*([\d.]+)\s*[-–]\s*\$?\s*([\d.]+)/);
  if (range) return `${formatMxn(Number(range[1]) * rate)} – ${formatMxn(Number(range[2]) * rate)}`;
  const num = Number(String(price).replace(/[^0-9.]/g, ""));
  return Number.isFinite(num) && num > 0 ? formatMxn(num * rate) : price;
}
export default function IpoPage() {
  const { fx } = useUsdMxn(120_000);
  const [status, setStatus] = useState<"all" | "expected" | "filed" | "priced">("all");
  const [search, setSearch] = useState("");
  const [ipos, setIpos] = useState<IpoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(status === "all" ? "/api/ipo" : `/api/ipo?status=${status}`);
      const data = await res.json();
      setIpos(data.ipos || data.items || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); setIpos([]); }
    finally { setLoading(false); }
  }, [status]);
  useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => ipos.filter((it) => !search || `${it.symbol || ""} ${it.name}`.toUpperCase().includes(search.toUpperCase())), [ipos, search]);
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto"><h1 className="text-lg font-bold">IPOs</h1></div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        <input className="ui-input" placeholder="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex flex-wrap gap-1">{(["all", "expected", "filed", "priced"] as const).map((s) => <button key={s} type="button" className={status === s ? "ui-chip ui-chip-active" : "ui-chip"} onClick={() => setStatus(s)}>{s === "all" ? "Todos" : STATUS_LABEL[s]}</button>)}</div>
        <button type="button" className="ui-btn ui-btn-primary w-full" onClick={() => void load()}>{loading ? "Cargando…" : "Actualizar"}</button>
        {error ? <p className="text-danger text-sm">{error}</p> : null}
        {visible.map((it, i) => (
          <div key={`${it.symbol || it.name}-${i}`} className="bg-card border border-border rounded-xl p-3">
            <p className="text-xs text-muted">{formatDay(it.date)} {it.exchange ? `· ${it.exchange}` : ""} {it.status ? `· ${STATUS_LABEL[it.status] || it.status}` : ""}</p>
            <p className="font-semibold text-sm">{it.symbol || "—"} · {it.name}</p>
            <p className="text-xs text-muted">{formatIpoPriceMxn(it.price, fx?.usdMxn) || it.price || "—"}</p>
          </div>
        ))}
      </main>
    </div>
  );
}
