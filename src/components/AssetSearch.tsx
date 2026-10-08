"use client";

import { useState, useEffect, useRef, useId } from "react";
import { normalizeSearchText } from "@/lib/search-text";
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
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dismissed = useRef(false);
  const [active, setActive] = useState(-1);
  const [error, setError] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) return;
    let cancelled = false;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(normalizeSearchText(q))}`, { signal: controller.signal }
        );
        if (!res.ok) throw new Error("search failed");
        const data = await res.json();
        if (!cancelled) {
          setHits((data.results || []).slice(0, 12));
          setActive(-1);
          if (!dismissed.current) setOpen(true);
        }
      } catch {
        if (!cancelled) { setHits([]); setError(true); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(t);
    };
  }, [q]);

  useEffect(() => {
    const onDoc = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) { dismissed.current = true; setOpen(false); }
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, []);

  useEffect(() => {
    if (!open || active < 0) return;
    const option = document.getElementById(`${id}-option-${active}`);
    const list = option?.parentElement;
    if (!option || !list) return;
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
    }
  }, [active, open, id]);

  const choose = (symbol: string) => {
    dismissed.current = true;
    setOpen(false);
    setQ("");
    setHits([]);
    setActive(-1);
    setLoading(false);
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
    <div ref={boxRef} className={`relative ${className}`} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) { dismissed.current = true; setOpen(false); }
    }}>
      <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-3 py-2.5 min-h-[48px]">
        <span className="text-muted text-sm">🔎</span>
        <input
          ref={inputRef}
          role="combobox"
          aria-label="Buscar activos por símbolo o nombre"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined}
          aria-busy={loading}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "Escape") { event.preventDefault(); dismissed.current = true; setOpen(false); return; }
            if (event.key === "Enter" && open && hits[active]) { event.preventDefault(); choose(hits[active].symbol); return; }
            if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
            if (!open && ["Home", "End"].includes(event.key)) return;
            event.preventDefault(); dismissed.current = false; setOpen(true);
            if (!hits.length) return;
            setActive((previous) => event.key === "Home" ? 0 : event.key === "End" ? hits.length - 1 : event.key === "ArrowDown" ? (previous + 1) % hits.length : (previous <= 0 ? hits.length - 1 : previous - 1));
          }}
          type="search"
          value={q}
          onChange={(e) => { dismissed.current = false; setQ(e.target.value); setLoading(Boolean(e.target.value.trim())); setError(false); setHits([]); setActive(-1); setOpen(true); }}
          onFocus={() => { dismissed.current = false; if (q.trim()) setOpen(true); }}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          autoComplete="off"
          enterKeyHint="search"
        />
        <button type="button" aria-label={open ? "Cerrar opciones" : "Abrir opciones"} aria-expanded={open} aria-controls={`${id}-list`}
          onClick={() => { const next = !open; inputRef.current?.focus(); dismissed.current = !next; setOpen(next); }}>⌄</button>
        {loading && (
          <span className="text-[10px] text-muted animate-pulse">…</span>
        )}
      </div>

      <p className="sr-only" role="status">{loading ? "Buscando activos…" : error ? "No se pudo buscar. Inténtalo de nuevo." : q.trim() ? `${hits.length} resultados disponibles` : ""}</p>
      {open && (
        <div id={`${id}-list`} role="listbox" aria-label="Activos disponibles" className="ui-combobox-options absolute z-50 left-0 right-0 mt-1.5 bg-card border border-border rounded-2xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
          {hits.length === 0 ? (
            <p className="text-sm text-muted px-4 py-3">{loading ? "Buscando…" : error ? "No se pudo buscar. Inténtalo de nuevo." : q.trim() ? "Sin resultados" : "Escribe un símbolo o nombre"}</p>
          ) : (
            hits.map((h, index) => (
              <button
                key={h.symbol + (h.exchange || "")}
                type="button"
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={active === index}
                data-active={active === index}
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}

                onClick={() => choose(h.symbol)}
                className="ui-combobox-option w-full text-left px-4 py-3 min-h-[52px] border-b border-border last:border-0 active:bg-secondary/60 flex items-start gap-3"
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
