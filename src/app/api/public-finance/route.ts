import { NextRequest, NextResponse } from "next/server";
import {
  freeNasdaqCalendar,
  freeNasdaqQuote,
  freeNasdaqScreener,
  freeYahooDividends,
  freeYahooSummary,
  publicFredCsv,
  publicSecCompanyFacts,
  publicSecRecentIpos,
  publicTradingViewScan,
  publicTreasuryDebt,
} from "@/lib/free-finance";
import { detectAssetType, detectRegion, isExcludedInstrument, normalizeYahooSymbol } from "@/lib/market-data/types";
import { sanitizeSymbol, sanitizeSymbolList } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

function dateOnly(value: string | null, fallback: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? value! : fallback;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const series = params.get("series")?.trim().toUpperCase() || "DGS3MO";
  const symbol = sanitizeSymbol(params.get("symbol"));
  const symbols = sanitizeSymbolList(params.get("symbols"), 50)
    .map(normalizeYahooSymbol)
    .filter((item) => !isExcludedInstrument(item));
  const calendar = params.get("calendar");
  const exchangeParam = params.get("exchange")?.toLowerCase() || "nasdaq";
  const exchange = ["nasdaq", "nyse", "amex"].includes(exchangeParam) ? exchangeParam : "nasdaq";
  const now = new Date();
  const from = dateOnly(params.get("from"), new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10));
  const to = dateOnly(params.get("to"), new Date(now.getTime() + 60 * 86_400_000).toISOString().slice(0, 10));
  const safeSymbol = symbol && !isExcludedInstrument(symbol) ? normalizeYahooSymbol(symbol) : null;

  const [fred, treasury, tradingview, yahooSummary, dividends, sec, nasdaq, nasdaqScreener, nasdaqCalendar, secIpos] = await Promise.all([
    publicFredCsv(series, 30),
    publicTreasuryDebt(),
    symbols.length ? publicTradingViewScan(symbols) : Promise.resolve([]),
    safeSymbol ? freeYahooSummary(safeSymbol) : Promise.resolve(null),
    safeSymbol ? freeYahooDividends(safeSymbol) : Promise.resolve([]),
    safeSymbol ? publicSecCompanyFacts(safeSymbol) : Promise.resolve(null),
    safeSymbol && detectRegion(safeSymbol) === "US"
      ? freeNasdaqQuote(safeSymbol, detectAssetType(safeSymbol) === "etf" ? "etf" : "stocks")
      : Promise.resolve(null),
    params.get("nasdaqScreener") === "1" ? freeNasdaqScreener(exchange) : Promise.resolve([]),
    calendar === "earnings" || calendar === "dividends" || calendar === "ipo"
      ? freeNasdaqCalendar(from, to, calendar)
      : Promise.resolve([]),
    params.get("ipos") === "1" ? publicSecRecentIpos(from, to) : Promise.resolve([]),
  ]);

  return NextResponse.json(
    {
      symbol: safeSymbol,
      fred,
      treasury,
      tradingview,
      yahoo: safeSymbol ? { summary: yahooSummary, dividends } : null,
      nasdaq,
      nasdaqScreener,
      sec,
      nasdaqCalendar,
      secIpos,
      sources: {
        yahoo: "Yahoo Finance (endpoints públicos/no oficiales; sin API key)",
        sec: "SEC EDGAR CompanyFacts y filings (sin API key; requiere User-Agent identificable)",
        nasdaq: "Nasdaq public quote/calendar endpoints (sin API key; sujetos a cambios)",
        tradingview: "TradingView Scanner API pública/no oficial (sin SLA)",
        fred: "FRED public CSV",
        treasury: "U.S. Treasury Fiscal Data API",
      },
      requiresApiKey: false,
      excluded: ["forex", "cryptocurrencies"],
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800",
      },
    }
  );
}
