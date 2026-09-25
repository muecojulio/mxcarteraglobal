"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuotes, useDividends } from "@/lib/market-data/client";
import { useUsdMxn, toMxn, formatMxn } from "@/lib/fx";
const FEATURED = [
  { symbol: "AAPL", name: "Apple Inc." }, { symbol: "MSFT", name: "Microsoft" }, { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "KO", name: "Coca-Cola" }, { symbol: "O", name: "Realty Income" }, { symbol: "SCHD", name: "Schwab US Dividend" },
  { symbol: "AMXL.MX", name: "América Móvil" }, { symbol: "WALMEX.MX", name: "Walmart México" }, { symbol: "GFNORTEO.MX", name: "Banorte" },
  { symbol: "FEMSAUBD.MX", name: "FEMSA" }, { symbol: "BIMBOA.MX", name: "Grupo Bimbo" },
];
function formatDate(iso: string) { try { return new Date(iso + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" }); } catch { return iso; } }
function FeaturedRow({ symbol, name }: { symbol: string; name: string }) {
  const { data: q } = useQuotes([symbol], 60_000);
  const { data: d } = useDividends(symbol);
  const { fx } = useUsdMxn();
  const quote = q?.quotes[0];
  const last = d?.dividends?.[0];
  return (
    <Link href={`/asset/${encodeURIComponent(symbol)}`} className="block bg-card border border-border rounded-xl p-3">
      <p className="font-semibold text-sm">{symbol} · {name}</p>
      <p className="text-xs text-muted">{quote ? formatMxn(toMxn(quote.price, quote.currency, fx?.usdMxn ?? null)) : "—"} {last ? `· último ${last.amount} ${last.currency} (${formatDate(last.date)})` : ""}</p>
    </Link>
  );
}
export default function DividendsPage() {
  const [q, setQ] = useState("");
  const list = useMemo(() => FEATURED.filter((f) => !q || f.symbol.includes(q.toUpperCase()) || f.name.toUpperCase().includes(q.toUpperCase())), [q]);
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <h1 className="text-lg font-bold">Dividendos</h1>
          <Link href="/dividends/analysis" className="text-primary text-sm">Análisis</Link>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        <input className="ui-input" placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
        {list.map((f) => <FeaturedRow key={f.symbol} symbol={f.symbol} name={f.name} />)}
      </main>
    </div>
  );
}
