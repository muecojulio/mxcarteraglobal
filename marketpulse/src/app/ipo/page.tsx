"use client";
import { useEffect, useState } from "react";
import { useUsdMxn, formatMxn } from "@/lib/fx";
type IpoItem = { date: string; symbol?: string; name: string; exchange?: string; price?: string; status?: string; totalSharesValue?: number };
export default function IpoPage() {
  const [items, setItems] = useState<IpoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { fx } = useUsdMxn();
  useEffect(() => {
    let cancel = false;
    fetch("/api/ipo").then(async (r) => (r.ok ? r.json() : { items: [] })).then((j) => { if (!cancel) setItems(j.items || []); }).catch(() => { if (!cancel) setItems([]); }).finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, []);
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto"><h1 className="text-lg font-bold">Ofertas públicas</h1></div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        <p className="text-xs text-muted">No es oferta de valores. Montos en MXN son estimados.</p>
        {loading ? <p className="text-sm text-muted">Cargando…</p> : items.length === 0 ? <p className="text-sm text-muted">Sin listados recientes en la API.</p> : items.map((it, i) => (
          <article key={`${it.symbol || it.name}-${i}`} className="bg-card border border-border rounded-xl p-3">
            <p className="text-xs text-muted">{it.date} {it.exchange ? `· ${it.exchange}` : ""}</p>
            <p className="font-semibold text-sm">{it.symbol ? `${it.symbol} · ` : ""}{it.name}</p>
            {it.price ? <p className="text-xs">Precio ref. {it.price}</p> : null}
            {it.totalSharesValue ? <p className="text-xs text-muted">{formatMxn((it.totalSharesValue) * (fx?.usdMxn || 17.5), 0)}</p> : null}
          </article>
        ))}
      </main>
    </div>
  );
}
