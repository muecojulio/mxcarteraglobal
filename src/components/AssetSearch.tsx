"use client";
import { useState } from "react";
import Link from "next/link";
import { useSymbolSearch } from "@/lib/market-data/client";
export function AssetSearch({ placeholder }: { placeholder?: string }) {
  const [q, setQ] = useState("");
  const { results, loading, search } = useSymbolSearch();
  return (
    <div className="relative">
      <input className="ui-input" value={q} placeholder={placeholder || "Buscar ticker"} onChange={(e) => { const v = e.target.value; setQ(v); void search(v); }} />
      {q ? (
        <div className="elastic-open absolute z-30 mt-1 w-full bg-card border border-border rounded-xl overflow-hidden">
          {loading ? <p className="px-3 py-2 text-xs text-muted">Buscando…</p> : results.length === 0 ? <p className="px-3 py-2 text-xs text-muted">Sin resultados</p> : results.slice(0, 8).map((r) => (
            <Link key={r.symbol} href={`/asset/${encodeURIComponent(r.symbol)}`} className="block px-3 py-2 text-sm border-b border-border last:border-0">
              <span className="font-semibold">{r.symbol}</span> <span className="text-muted text-xs">{r.name}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
