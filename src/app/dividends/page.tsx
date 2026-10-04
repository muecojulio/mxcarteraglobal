"use client";
import Link from "next/link";
import { useQuotes } from "@/lib/market-data/client";
import { useUsdMxn, toMxn, formatMxn } from "@/lib/fx";
import { upcomingDividends } from "@/lib/dividends-data";
const FEATURED = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "KO", name: "Coca-Cola" },
  { symbol: "O", name: "Realty Income" },
  { symbol: "SCHD", name: "Schwab US Dividend Equity ETF" },
  { symbol: "AMXL.MX", name: "América Móvil" },
  { symbol: "WALMEX.MX", name: "Walmart México" },
  { symbol: "GFNORTEO.MX", name: "Banorte" },
  { symbol: "FEMSAUBD.MX", name: "FEMSA" },
  { symbol: "BIMBOA.MX", name: "Grupo Bimbo" },
];
export default function DividendsPage() {
  const { data } = useQuotes(FEATURED.map((f) => f.symbol), 60_000);
  const { fx } = useUsdMxn();
  return (
    <div className="flex flex-col min-h-full">
      <header className="app-header safe-top">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <h1 className="text-lg font-bold">Dividendos</h1>
          <Link href="/dividends/analysis" className="text-primary text-sm">Análisis</Link>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3 stagger">
        <h2 className="text-xs font-semibold text-muted uppercase">Destacados ZIP</h2>
        {FEATURED.map((f) => {
          const q = data?.quotes.find((x) => x.symbol.toUpperCase() === f.symbol.toUpperCase());
          return (
            <Link key={f.symbol} href={`/asset/${encodeURIComponent(f.symbol)}`} className="flex justify-between bg-card border border-border rounded-xl p-3 text-sm">
              <span>{f.symbol}<span className="block text-xs text-muted">{f.name}</span></span>
              <span>{q ? formatMxn(toMxn(q.price, q.currency, fx?.usdMxn ?? null)) : "—"}</span>
            </Link>
          );
        })}
        <h2 className="text-xs font-semibold text-muted uppercase">Próximos</h2>
        {upcomingDividends.map((e) => (
          <p key={e.symbol} className="text-xs bg-card border border-border rounded-xl p-3">{e.symbol} · ex {e.exDate} · {e.amount} {e.currency}</p>
        ))}
      </main>
    </div>
  );
}
