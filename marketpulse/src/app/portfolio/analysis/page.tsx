"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadPositions, type Position } from "@/lib/persist";
import { useQuotes } from "@/lib/market-data/client";
import { useUsdMxn, toMxn, formatMxn } from "@/lib/fx";
export default function PortfolioAnalysisPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  useEffect(() => setPositions(loadPositions()), []);
  const { data } = useQuotes(positions.map((p) => p.symbol), 60_000);
  const { fx } = useUsdMxn();
  const rows = useMemo(() => positions.map((p) => {
    const q = data?.quotes.find((x) => x.symbol === p.symbol);
    const val = toMxn((q?.price ?? p.avgPrice) * p.shares, p.currency, fx?.usdMxn ?? null);
    return { ...p, val };
  }), [positions, data, fx]);
  const total = rows.reduce((a, r) => a + r.val, 0);
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
          <Link href="/portfolio" className="text-primary text-sm">← Cartera</Link>
          <h1 className="text-lg font-bold">Análisis</h1>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        <p className="text-sm">Valor estimado {formatMxn(total)}</p>
        {rows.map((r) => (
          <div key={r.id} className="bg-card border border-border rounded-xl p-3">
            <p className="font-semibold text-sm">{r.symbol}</p>
            <p className="text-xs text-muted">{total ? ((r.val / total) * 100).toFixed(1) : "0"}% · {formatMxn(r.val)}</p>
          </div>
        ))}
        <p className="text-[11px] text-muted">Concentración orientativa. No ejecutamos órdenes.</p>
      </main>
    </div>
  );
}
