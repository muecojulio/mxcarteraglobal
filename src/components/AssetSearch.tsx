"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Hit = {
  symbol: string;
  name: string;
  exchange?: string;
  type?: string;
  region?: string;
};

type Props = {
  placeholder?: string;
  className?: string;
  /** Si true, al elegir también se puede notificar (watchlist) */
  onSelect?: (symbol: string) => void;
};

export function AssetSearch({
  placeholder = "Buscar BMV, BIVA o SIC…",
  className = "",
  onSelect,
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 1) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q.trim())}`
        );
        if (!res.ok) throw new Error("search failed");
        const data = await res.json();
        if (!cancelled) {
          setHits((data.results || []).slice(0, 12));
          setOpen(true);
        }
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const choose = (symbol: string) => {
    setOpen(false);
    setQ("");
    onSelect?.(symbol);
    router.push(`/asset/${encodeURIComponent(symbol)}`);
  };

  const typeLabel = (t?: string) => {
    if (!t) return "";
    const u = t.toUpperCase();
    if (u.includes("ETF")) return "ETF";
    if (u.includes("EQUITY") || u === "STOCK") return "Acción";
    if (u.includes("FUND")) return "Fondo";
    return t;
  };

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-3 py-2.5 min-h-[48px]">
        <span className="text-muted text-sm">🔎</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length && setOpen(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          autoComplete="off"
          enterKeyHint="search"
        />
        {loading && (
          <span className="text-[10px] text-muted animate-pulse">…</span>
        )}
      </div>

      {open && (hits.length > 0 || (q.trim() && !loading)) && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-card border border-border rounded-2xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
          {hits.length === 0 ? (
            <p className="text-sm text-muted px-4 py-3">Sin resultados</p>
          ) : (
            hits.map((h) => (
              <button
                key={h.symbol + (h.exchange || "")}
                type="button"
                onClick={() => choose(h.symbol)}
                className="w-full text-left px-4 py-3 min-h-[52px] border-b border-border last:border-0 active:bg-secondary/60 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{h.symbol}</p>
                  <p className="text-xs text-muted truncate">{h.name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {typeLabel(h.type) && (
                    <p className="text-[10px] font-medium text-primary">
                      {typeLabel(h.type)}
                    </p>
                  )}
                  {h.exchange && (
                    <p className="text-[10px] text-muted">{h.exchange}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
