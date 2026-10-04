"use client";

import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSymbolSearch } from "@/lib/market-data/client";

function normalizeSearchText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-MX").trim();
}

export function AssetSearch({ placeholder }: { placeholder?: string }) {
  const router = useRouter();
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [debouncing, setDebouncing] = useState(false);
  const { results, loading, error, search } = useSymbolSearch();
  const normalizedQuery = normalizeSearchText(query);
  const visibleResults = useMemo(() => {
    if (!normalizedQuery) return [];
    return results.filter((result) => normalizeSearchText(`${result.symbol} ${result.name}`).includes(normalizedQuery)).slice(0, 8);
  }, [normalizedQuery, results]);
  const isBusy = loading || debouncing;
  const popupId = `${id}-popup`;
  const listboxId = `${id}-listbox`;
  const activeOptionId = activeIndex >= 0 && activeIndex < visibleResults.length ? `${id}-option-${activeIndex}` : undefined;

  useEffect(() => {
    if (!query.trim()) {
      void search("");
      return;
    }
    const timer = window.setTimeout(() => {
      setDebouncing(false);
      void search(query);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [query, search]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!activeOptionId || !open) return;
    document.getElementById(activeOptionId)?.scrollIntoView({ block: "nearest" });
  }, [activeOptionId, open]);

  const choose = (symbol: string) => {
    setQuery(symbol);
    setOpen(false);
    setActiveIndex(-1);
    router.push(`/asset/${encodeURIComponent(symbol)}`);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && !open && query.trim()) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(!isBusy && visibleResults.length > 0 ? 0 : -1);
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!open || visibleResults.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => current < 0 ? 0 : (current + 1) % visibleResults.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => current <= 0 ? visibleResults.length - 1 : current - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(visibleResults.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(visibleResults[activeIndex >= 0 ? activeIndex : 0].symbol);
    }
  };

  const statusMessage = isBusy
    ? "Buscando instrumentos."
    : error
      ? `No se pudo completar la búsqueda. ${error}`
      : open && query.trim()
        ? visibleResults.length ? `${visibleResults.length} resultados disponibles.` : "Sin coincidencias."
        : "";

  return (
    <div ref={rootRef} className="relative">
      <label className="sr-only" htmlFor={`${id}-input`}>Buscar activo por ticker o nombre</label>
      <input
        id={`${id}-input`}
        className="ui-input"
        type="search"
        role="combobox"
        aria-label="Buscar activo por ticker o nombre"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={open && !!query.trim()}
        aria-controls={open && query.trim() && visibleResults.length > 0 && !isBusy && !error ? listboxId : undefined}
        aria-activedescendant={open ? activeOptionId : undefined}
        aria-busy={isBusy}
        aria-invalid={!!error}
        aria-describedby={`${id}-status`}
        autoComplete="off"
        spellCheck={false}
        value={query}
        placeholder={placeholder || "Buscar ticker"}
        onChange={(event) => {
          setQuery(event.target.value);
          setDebouncing(!!event.target.value.trim());
          setOpen(!!event.target.value.trim());
          setActiveIndex(-1);
        }}
        onFocus={() => { if (query.trim()) setOpen(true); }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          window.setTimeout(() => {
            if (!rootRef.current?.contains(document.activeElement)) {
              setOpen(false);
              setActiveIndex(-1);
            }
          }, 0);
        }}
      />
      <p id={`${id}-status`} className="sr-only" role="status" aria-live="polite" aria-atomic="true">{statusMessage}</p>

      {open && query.trim() ? (
        <div id={popupId} className="ui-combobox-popup">
          {isBusy ? <p className="px-4 py-3 text-sm text-muted" aria-hidden="true">Buscando…</p> : null}
          {!isBusy && error ? <p className="px-4 py-3 text-sm text-danger" aria-hidden="true">No se pudo completar la búsqueda.</p> : null}
          {!isBusy && !error && visibleResults.length === 0 ? <p className="px-4 py-3 text-sm text-muted" aria-hidden="true">Sin coincidencias.</p> : null}
          {!isBusy && !error && visibleResults.length > 0 ? (
            <div id={listboxId} role="listbox" aria-label="Resultados de búsqueda">
              {visibleResults.map((result, index) => (
                <div
                  key={result.symbol}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={activeIndex === index}
                  aria-posinset={index + 1}
                  aria-setsize={visibleResults.length}
                  className="ui-combobox-option"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(result.symbol)}
                >
                  <span className="font-semibold">{result.symbol}</span>
                  <span className="ml-2 min-w-0 truncate text-xs text-muted">{result.name}{result.exchange ? ` · ${result.exchange}` : ""}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
