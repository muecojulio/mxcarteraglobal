"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuotes } from "@/lib/market-data/client";

const ETFS = [
  { symbol: "SPY", name: "SPDR S&P 500" },
  { symbol: "QQQ", name: "Invesco QQQ" },
  { symbol: "VOO", name: "Vanguard S&P 500" },
  { symbol: "VTI", name: "Vanguard Total Stock" },
  { symbol: "SCHD", name: "Schwab US Dividend" },
  { symbol: "VIG", name: "Vanguard Dividend Appreciation" },
  { symbol: "JEPI", name: "JPMorgan Equity Premium Income" },
  { symbol: "JEPQ", name: "JPMorgan Nasdaq Equity Premium" },
  { symbol: "VNQ", name: "Vanguard Real Estate" },
  { symbol: "XLK", name: "Technology Select Sector" },
  { symbol: "XLF", name: "Financial Select Sector" },
  { symbol: "GLD", name: "SPDR Gold Shares" },
  { symbol: "EEM", name: "iShares MSCI Emerging Markets" },
  { symbol: "IWM", name: "iShares Russell 2000" },
];

function fmt(n: number) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function EtfsPage() {
  const symbols = useMemo(() => ETFS.map((e) => e.symbol), []);
  const { data, loading, refresh } = useQuotes(symbols, 45_000);
  const map = useMemo(() => {
    const m = new Map<string, { price: number; changePercent: number; currency: string }>();
    (data?.quotes ?? []).forEach((q) =>
      m.set(q.symbol.toUpperCase(), {
        price: q.price,
        changePercent: q.changePercent,
        currency: q.currency,
      })
    );
    return m;
  }, [data]);

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border safe-top">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <h1 className="text-lg font-bold">ETFS</h1>
          <button
            type="button"
            onClick={() => refresh()}
            className="w-9 h-9 rounded-full border border-border text-muted text-sm"
          >
            ↻
          </button>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pb-10 pt-3">
        <p className="text-xs text-muted mb-3 leading-relaxed">
          ETFS con ficha completa (precio, gráfico, dividendos y métricas cuando
          la API los traiga). Toca uno para abrir el detalle.
        </p>
        {loading && (
          <p className="text-xs text-muted mb-2">Actualizando precios…</p>
        )}
        <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
          {ETFS.map((e) => {
            const q = map.get(e.symbol);
            return (
              <Link
                key={e.symbol}
                href={`/asset/${encodeURIComponent(e.symbol)}`}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm">{e.symbol}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted">
                      ETFS
                    </span>
                  </div>
                  <p className="text-xs text-muted truncate">{e.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm">
                    {q ? fmt(q.price) : "—"}
                  </p>
                  {q && (
                    <p
                      className={`text-xs font-medium ${
                        q.changePercent >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {q.changePercent >= 0 ? "+" : ""}
                      {q.changePercent.toFixed(2)}%
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
