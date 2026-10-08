"use client";

import { useState, useMemo, useEffect } from "react";
import { SwipeActions } from "@/components/ui/SwipeActions";
import { ScrollableChips } from "@/components/ui/ScrollableChips";
import Link from "next/link";
import { useQuotes } from "@/lib/market-data/client";
import { loadWatchlist, saveWatchlist } from "@/lib/persist";
import { LiveBadge } from "@/components/LiveBadge";
import { AssetSearch } from "@/components/AssetSearch";
import type { Quote } from "@/lib/market-data/types";
import { useUsdMxn, toMxn, formatMxn } from "@/lib/fx";
import { useToast } from "@/components/Toast";
import {
  useHydratedState,
  useMounted,
  localStorageIdentity,
} from "@/lib/use-hydrated-value";

/** Constante de módulo: useSyncExternalStore exige un snapshot estable. */
const EMPTY_SYMBOLS: string[] = [];

export default function WatchlistPage() {
  const toast = useToast();
  const [symbols, setSymbols] = useHydratedState<string[]>(
    localStorageIdentity("marketpulse_watchlist"),
    loadWatchlist,
    EMPTY_SYMBOLS
  );
  const hydrated = useMounted();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "MX" | "US">("ALL");
  const [showAdd, setShowAdd] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [sortBy, setSortBy] = useState<"symbol" | "change">("symbol");

  useEffect(() => {
    if (!hydrated) return;
    saveWatchlist(symbols);
  }, [symbols, hydrated]);

  const { data, loading, wsStatus, error, refresh } = useQuotes(symbols, 45_000);
  const { fx } = useUsdMxn(120_000);
  const usdMxn = fx?.usdMxn ?? null;

  const quotes: Quote[] = data?.quotes ?? [];
  const usingReal = data?.usingRealData ?? false;

  const filtered = useMemo(() => {
    let list = [...quotes];

    if (filter === "MX") list = list.filter((s) => s.region === "MX");
    if (filter === "US") list = list.filter((s) => s.region === "US");

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.symbol.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortBy === "change") return b.changePercent - a.changePercent;
      return a.symbol.localeCompare(b.symbol);
    });

    return list;
  }, [quotes, filter, search, sortBy]);

  const positiveCount = quotes.filter((s) => s.changePercent >= 0).length;
  const negativeCount = quotes.length - positiveCount;

  const removeSymbol = (symbol: string) => {
    setSymbols((prev) => prev.filter((s) => s !== symbol));
    toast(`Quitado: ${symbol}`);
  };

  const addSymbol = (symbol: string) => {
    const s = symbol.trim().toUpperCase();
    if (!s) return;
    if (!symbols.includes(s)) {
      setSymbols((prev) => [...prev, s]);
      toast(`Añadido a seguimiento: ${s}`);
    } else {
      toast(`Ya estaba en tu lista: ${s}`);
    }
    setShowAdd(false);
    setAddQuery("");
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border safe-top">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Lista de seguimiento</h1>
            {usingReal && (
              <span className="text-[10px] font-medium bg-success/15 text-success px-2 py-0.5 rounded-full">
                EN VIVO
              </span>
            )}
            <LiveBadge status={wsStatus} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refresh()}
              className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted text-sm active:scale-95"
              aria-label="Actualizar"
            >
              ↻
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-medium active:scale-95 transition-transform"
              aria-label="Añadir"
            >
              +
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full">
        <div className="px-4 pt-3">
          <AssetSearch
            placeholder="Buscar ticker o nombre (acción, ETF, FIBRA)"
            onSelect={(sym) => {
              const s = sym.trim().toUpperCase();
              if (s) {
                setSymbols((prev) => {
                  if (prev.includes(s)) {
                    toast(`Ya estaba en tu lista: ${s}`);
                    return prev;
                  }
                  toast(`Añadido a seguimiento: ${s}`);
                  return [...prev, s];
                });
              }
            }}
          />
          <p className="text-[10px] text-muted mt-1.5 px-1">
            Al elegir un resultado se abre la ficha y se agrega a tu lista de seguimiento.
          </p>
        </div>
        {/* Resumen */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted">{quotes.length} activos</span>
            <span className="text-success font-medium">▲ {positiveCount}</span>
            <span className="text-danger font-medium">▼ {negativeCount}</span>
            {loading && (
              <span className="text-muted text-xs animate-pulse">Actualizando…</span>
            )}
          </div>
          {error && (
            <div className="mt-2 flex items-center gap-2">
              <p className="text-xs text-danger flex-1">
                No se pudo actualizar · {error}
              </p>
              <button
                type="button"
                onClick={() => refresh()}
                className="text-xs font-semibold px-3 py-2 rounded-xl border border-border min-h-[40px]"
              >
                Reintentar
              </button>
            </div>
          )}
        </div>

        {/* Buscador */}
        <div className="px-4 pb-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">
              🔍
            </span>
            <input
              type="search"
              aria-label="Filtrar lista de seguimiento"
              placeholder="Buscar símbolo o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card border border-border rounded-xl py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted"
            />
          </div>
        </div>

        {/* Filtros */}
        <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
          <ScrollableChips label="Filtrar seguimiento por mercado" value={filter} onChange={setFilter} options={[
            { value: "ALL", label: "Todos" }, { value: "MX", label: "🇲🇽 México" }, { value: "US", label: "🇺🇸 EE.UU." },
          ]} />
          <button
            onClick={() =>
              setSortBy((s) => (s === "symbol" ? "change" : "symbol"))
            }
            className="ml-auto px-3 py-1.5 rounded-full text-xs font-medium bg-card border border-border text-muted whitespace-nowrap"
          >
            {sortBy === "symbol" ? "Orden: A-Z" : "Orden: % del día"}
          </button>
        </div>

        {/* Lista */}
        <div className="px-4 pb-6">
          {loading && quotes.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="bg-card rounded-xl border border-border h-16 animate-pulse"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-4xl mb-3">⭐</p>
              <p className="font-medium mb-1">
                {search ? "Sin resultados" : "Tu lista está vacía"}
              </p>
              <p className="text-sm text-muted mb-5">
                {search
                  ? "Prueba con otro término o limpia el filtro"
                  : "Añade acciones, ETFS o FIBRAs para ver precios aquí"}
              </p>
              {!search && (
                <button
                  type="button"
                  onClick={() => setShowAdd(true)}
                  className="min-h-[48px] px-6 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold"
                >
                  Añadir primer título
                </button>
              )}
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
              {filtered.map((stock) => (
                <SwipeActions key={stock.symbol} label={stock.symbol} actions={
                  <button
                    onClick={() => removeSymbol(stock.symbol)}
                    className="w-8 h-8 flex items-center justify-center text-muted hover:text-danger transition-colors flex-shrink-0"
                    aria-label={`Eliminar ${stock.symbol}`}
                  >
                    ✕
                  </button>
                }>
                <div
                  className="flex items-center gap-3 px-4 py-3.5 active:bg-secondary/40 transition-colors"
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      stock.region === "MX"
                        ? "bg-green-500/15 text-green-600 dark:text-green-400"
                        : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    {stock.region === "MX" ? "MX" : "US"}
                  </div>

                  <Link href={`/asset/${encodeURIComponent(stock.symbol)}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm">{stock.symbol}</p>
                      {stock.market && (
                        <span className="text-[10px] text-muted bg-secondary px-1.5 py-0.5 rounded">
                          {stock.market}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted truncate">{stock.name}</p>
                  </Link>

                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-sm">
                      {formatMxn(
                        toMxn(stock.price, stock.currency || stock.region === "MX" ? "MXN" : "USD", usdMxn)
                      )}
                    </p>
                    <p
                      className={`text-xs font-medium ${
                        stock.changePercent >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {stock.changePercent >= 0 ? "+" : ""}
                      {stock.changePercent.toFixed(2)}%
                    </p>
                  </div>


                </div>
                </SwipeActions>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal añadir */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowAdd(false)}
          />
          <div className="relative bg-card rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[70vh] overflow-hidden flex flex-col safe-bottom">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="font-semibold">Añadir a lista de seguimiento</h2>
              <button
                onClick={() => setShowAdd(false)}
                className="text-muted text-xl w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              <input
                type="text"
                aria-label="Símbolo a añadir"
                placeholder="Símbolo (ej. AAPL, AMXL.MX, GOOGL)"
                value={addQuery}
                onChange={(e) => setAddQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addSymbol(addQuery);
                }}
                className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                autoFocus
              />
              <p className="text-xs text-muted">
                Escribe el símbolo y pulsa Añadir. Usa .MX para acciones mexicanas.
              </p>
              <div className="flex flex-wrap gap-2">
                {["GOOGL", "META", "AMZN", "CEMEXCPO.MX", "SAP.DE", "VOD.L", "7203.T"].map(
                  (s) => (
                    <button
                      key={s}
                      onClick={() => addSymbol(s)}
                      disabled={symbols.includes(s)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-background disabled:opacity-40"
                    >
                      {s}
                    </button>
                  )
                )}
              </div>
              <button
                onClick={() => addSymbol(addQuery)}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm active:scale-[0.98] transition-transform"
              >
                Añadir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
