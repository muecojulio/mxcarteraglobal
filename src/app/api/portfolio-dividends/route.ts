import { NextRequest, NextResponse } from "next/server";
import { freeNasdaqCalendar } from "@/lib/free-finance";
import { isExcludedInstrument, normalizeYahooSymbol } from "@/lib/market-data/types";
import { sanitizeSymbolList } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

type UpcomingDividend = {
  symbol: string;
  exDate: string;
  amount: number | null;
  paymentDate?: string;
  recordDate?: string;
  source: string;
};

function numberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const number = Number(String(value).replace(/[$,%\s,]/g, ""));
  return Number.isFinite(number) ? number : null;
}

/**
 * GET /api/portfolio-dividends?symbols=AAPL,MSFT,AMXL.MX
 * Calendario público Nasdaq primero; FMP solo completa símbolos faltantes.
 */
export async function GET(req: NextRequest) {
  const symbols = sanitizeSymbolList(req.nextUrl.searchParams.get("symbols"), 40)
    .map(normalizeYahooSymbol)
    .filter((symbol) => !isExcludedInstrument(symbol));

  if (!symbols.length) {
    return NextResponse.json({ upcoming: [], count: 0, symbols: [], source: "none" });
  }

  const from = new Date().toISOString().slice(0, 10);
  const toDate = new Date();
  toDate.setDate(toDate.getDate() + 90);
  const to = toDate.toISOString().slice(0, 10);
  const wanted = new Set(symbols);
  const upcoming: UpcomingDividend[] = [];

  try {
    const rows = await freeNasdaqCalendar(from, to, "dividends");
    for (const value of rows) {
      if (!value || typeof value !== "object") continue;
      const row = value as Record<string, unknown>;
      const symbol = normalizeYahooSymbol(String(row.symbol || row.ticker || ""));
      if (!wanted.has(symbol) || isExcludedInstrument(symbol)) continue;
      const exDate = String(row.exOrEffDate || row.exDate || row.exdividendDate || row.date || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(exDate)) continue;
      upcoming.push({
        symbol,
        exDate,
        amount: numberOrNull(row.amount ?? row.dividend ?? row.dividendAmount),
        ...(row.paymentDate ? { paymentDate: String(row.paymentDate).slice(0, 10) } : {}),
        ...(row.recordDate ? { recordDate: String(row.recordDate).slice(0, 10) } : {}),
        source: "nasdaq-public",
      });
    }
  } catch {
    // FMP completa los símbolos que no cubra el calendario público.
  }

  const covered = new Set(upcoming.map((row) => row.symbol));
  const missing = symbols.filter((symbol) => !covered.has(symbol));
  const fmp = process.env.FMP_API_KEY?.trim();
  if (fmp && missing.length) {
    try {
      const res = await fetch(
        `https://financialmodelingprep.com/stable/dividends-calendar?from=${from}&to=${to}&apikey=${fmp}`,
        { next: { revalidate: 3600 } }
      );
      if (res.ok) {
        const list: unknown = await res.json();
        if (Array.isArray(list)) {
          for (const value of list) {
            if (!value || typeof value !== "object") continue;
            const row = value as Record<string, unknown>;
            const symbol = normalizeYahooSymbol(String(row.symbol || ""));
            const exDate = String(row.date || row.exDate || "").slice(0, 10);
            if (!missing.includes(symbol) || !/^\d{4}-\d{2}-\d{2}$/.test(exDate)) continue;
            upcoming.push({
              symbol,
              exDate,
              amount: numberOrNull(row.adjDividend ?? row.dividend),
              ...(row.paymentDate ? { paymentDate: String(row.paymentDate).slice(0, 10) } : {}),
              ...(row.recordDate ? { recordDate: String(row.recordDate).slice(0, 10) } : {}),
              source: "fmp-fallback",
            });
          }
        }
      }
    } catch {
      // Se conservan los datos públicos ya cargados.
    }
  }

  upcoming.sort((a, b) => a.exDate.localeCompare(b.exDate));
  const sources = [...new Set(upcoming.map((row) => row.source))];
  return NextResponse.json(
    {
      from,
      to,
      symbols,
      upcoming,
      count: upcoming.length,
      usingRealData: upcoming.length > 0,
      source: sources.length ? sources.join("+") : "none",
      sourcesAttempted: ["nasdaq-public", ...(fmp ? ["fmp-fallback"] : [])],
    },
    { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } }
  );
}
