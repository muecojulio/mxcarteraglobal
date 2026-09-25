"use client";
import { useCallback, useEffect, useState } from "react";
import { useUsdMxn, formatMxn } from "@/lib/fx";
type IpoItem = { date: string; symbol?: string; name: string; exchange?: string; price?: string; status?: string; numberOfShares?: number; totalSharesValue?: number };
function formatDay(iso: string) { try { return new Date(iso + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", year: "numeric" }); } catch { return iso; } }
function formatShares(n?: number) { if (n == null) return null; if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M acciones`; if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K acciones`; return `${n} acciones`; }
export default function IpoPage() {
  const { fx } = useUsdMxn();
  const [items, setItems] = useState<IpoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await fetch("/api/ipo"); const data = await res.json(); setItems(Array.isArray(data.items) ? data.items : []); } catch { setItems([]); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto"><h1 className="text-lg font-bold">IPOs</h1></div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        <button type="button" className="ui-btn ui-btn-primary w-full" onClick={() => void load()}>{loading ? "Cargando…" : "Actualizar"}</button>
        {items.map((it, i) => (
          <div key={`${it.symbol || it.name}-${i}`} className="bg-card border border-border rounded-xl p-3">
            <p className="text-xs text-muted">{formatDay(it.date)} {it.exchange ? `· ${it.exchange}` : ""}</p>
            <p className="font-semibold text-sm">{it.symbol || "—"} · {it.name}</p>
            <p className="text-xs text-muted">{it.price || "—"} · {formatShares(it.numberOfShares) || "—"} {it.totalSharesValue ? `· ${formatMxn(it.totalSharesValue * (fx?.usdMxn ?? 17.5))}` : ""}</p>
          </div>
        ))}
      </main>
    </div>
  );
}
