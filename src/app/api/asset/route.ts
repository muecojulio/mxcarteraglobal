import { NextRequest, NextResponse } from "next/server";
import { getMarketDataProvider } from "@/lib/market-data";
import { freeYahooSummary, freeYahooDividends } from "@/lib/free-finance";
import { freeYahooHistory } from "@/lib/yahoo-history";
import { getFibraMeta } from "@/lib/fibra-meta";
import { isSicSymbol } from "@/lib/sic-catalog";
import { sanitizeRange, sanitizeSymbol } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

const HISTORY_RANGES = ["5d", "1mo", "6mo", "1y", "5y"] as const;

export async function GET(req: NextRequest) {
  const symbol = sanitizeSymbol(req.nextUrl.searchParams.get("symbol")) || "";
  const range = sanitizeRange(req.nextUrl.searchParams.get("range"), HISTORY_RANGES, "1y");
  if (!symbol) return NextResponse.json({ error: "symbol requerido" }, { status: 400 });
  try {
    const p = getMarketDataProvider();
    const [quote, dividends, summary, history] = await Promise.all([
      p.getQuote(symbol),
      p.getDividends ? p.getDividends(symbol) : freeYahooDividends(symbol),
      freeYahooSummary(symbol),
      freeYahooHistory(symbol, range),
    ]);
    const fibra = getFibraMeta(symbol);
    const assetType = fibra ? "fibra" : isSicSymbol(symbol) && /ETF|UCITS/i.test(symbol) ? "etf" : undefined;
    return NextResponse.json({
      quote,
      profile: quote ? { name: quote.name, exchange: quote.exchange, country: quote.region } : null,
      history,
      stats: {
        pe: summary.pe,
        peg: summary.peg,
        pb: summary.pb,
        ps: summary.ps,
        marketCap: summary.marketCap,
        high52: summary.high52,
        low52: summary.low52,
        divYield: summary.divYield,
        expenseRatio: summary.expenseRatio,
        avgVolume: summary.avgVolume,
      },
      growth: { rev: summary.revGrowth, eps: summary.epsGrowth },
      finance: {
        roe: summary.roe,
        netMargin: null,
        grossMargin: null,
        debtEquity: summary.debtEquity,
        income: [] as Array<{ year: string; revenue: number; netIncome: number; margin: number }>,
      },
      recommendation: null,
      priceTarget: null,
      earnings: [],
      dividends: dividends || [],
      assetType,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
