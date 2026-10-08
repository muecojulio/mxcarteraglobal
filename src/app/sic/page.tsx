"use client";

import { useMemo, useState } from "react";
import { AccessibleTabs } from "@/components/ui/AccessibleTabs";
import Link from "next/link";
import { useQuotes } from "@/lib/market-data/client";
import { useUsdMxn, toMxn, formatMxn } from "@/lib/fx";
import { SIC_STOCKS, SIC_ETFS, searchSic, type SicKind } from "@/lib/sic-catalog";

export default function SicPage() {
  const [tab, setTab] = useState<SicKind | "ALL">("stock");
  const [q, setQ] = useState("");
  const { fx } = useUsdMxn(120_000);
  const usdMxn = fx?.usdMxn ?? null;

  const catalog = useMemo(() => searchSic(q, tab), [q, tab]);

  const quoteSymbols = useMemo(() => {
    return catalog.slice(0, 80).map((i) => i.symbol);
  }, [catalog]);

  const { data, loading } = useQuotes(quoteSymbols, 60_000);
  const map = useMemo(() => {
    const m = new Map<string, { price: number; changePercent: number; currency: string }>();
    (data?.quotes ?? []).forEach((row) =>
      m.set(row.symbol.toUpperCase(), {
        price: row.price,
        changePercent: row.changePercent,
        currency: row.currency,
      })
    );
    return m;
  }, [data]);

  const filtered = useMemo(() => {
    if (q.trim() || tab === "ALL") {
      return [...catalog].sort((a, b) => a.symbol.localeCompare(b.symbol));
    }
    const withQuote = catalog
      .map((item) => {
        const quote = map.get(item.symbol.toUpperCase());
        return { item, ch: quote?.changePercent };
      })
      .filter((x) => x.ch != null)
      .sort((a, b) => (a.ch as number) - (b.ch as number))
      .filter((x) => (x.ch as number) < 0)
      .slice(0, 15)
      .map((x) => x.item);
    return withQuote;
  }, [catalog, map, q, tab]);

  const results = <>
        <p className="text-[11px] text-muted mb-2">
          {tab !== "ALL" && !q.trim()
            ? `${filtered.length} que más bajaron hoy`
            : `${filtered.length} resultados`}
          {tab === "ALL" && catalog.length > 80
            ? " · precios en vivo de los primeros 80 (usa el buscador)"
            : ""}
          {loading ? " · actualizando…" : ""}
        </p>

        <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
          {filtered.length === 0 && (
            <p className="text-sm text-muted text-center py-8 px-4">
              Sin coincidencias. Prueba AAPL, NVDA, SPY, SCHD, EWW…
            </p>
          )}
          {filtered.slice(0, 120).map((item) => {
            const quote = map.get(item.symbol.toUpperCase());
            const mxn =
              quote != null
                ? formatMxn(toMxn(quote.price, quote.currency || "USD", usdMxn))
                : "—";
            return (
              <Link
                key={item.symbol + item.kind}
                href={`/asset/${encodeURIComponent(item.symbol)}`}
                className="flex items-center justify-between px-4 py-3 min-h-[56px]"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm">{item.symbol}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      SIC
                    </span>
                    <span className="text-[10px] text-muted">
                      {item.kind === "etf" ? "ETF" : "Acción"}
                    </span>
                  </div>
                  <p className="text-xs text-muted truncate">{item.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm">{mxn}</p>
                  {quote && (
                    <p
                      className={`text-xs font-medium ${
                        quote.changePercent >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {quote.changePercent >= 0 ? "+" : ""}
                      {quote.changePercent.toFixed(2)}%
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

  </>;

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border safe-top">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <h1 className="text-lg font-bold">SIC · Mercado Global</h1>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 pb-10 pt-3">
        <p className="text-xs text-muted mb-3 leading-relaxed">
          Acciones y ETFS del <span className="text-foreground font-medium">Sistema Internacional de Cotizaciones (SIC)</span> de la BMV.
          Se operan en México en pesos, con el mismo esquema fiscal local. El SIC tiene más de 3,500
          valores; aquí están los más líquidos y una base amplia para buscar por ticker o nombre.
          Precios de referencia en MXN (origen USD/otra divisa × tipo de cambio).
        </p>

        <input
          type="search"
          aria-label="Buscar en el catálogo SIC"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar ticker o nombre (AAPL, VOO, Novo…)"
          className="w-full mb-3 bg-card border border-border rounded-2xl py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 min-h-[48px]"
        />

        <AccessibleTabs label="Tipos de activos SIC" tabs={[
          { value: "stock", label: "Acciones SIC" },
          { value: "etf", label: "ETFS SIC" },
          { value: "ALL", label: "Todos" },
        ]} value={tab} onChange={setTab} panels={{ stock: results, etf: results, ALL: results }} />

        <p className="text-[11px] text-muted text-center mt-4 leading-relaxed">
          Catálogo de referencia ({SIC_STOCKS.length} acciones + {SIC_ETFS.length} ETFS
          frecuentes). El listado oficial completo está en bmv.com.mx · Mercado Global.
          No es asesoría ni lista exhaustiva de los ~3,700 valores del SIC.
        </p>
      </main>
    </div>
  );
}
