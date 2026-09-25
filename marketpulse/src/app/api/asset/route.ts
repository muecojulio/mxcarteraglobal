import { NextRequest, NextResponse } from "next/server";
import { getMarketDataProvider } from "@/lib/market-data";
import { freeYahooSummary, freeYahooDividends } from "@/lib/free-finance";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = (req.nextUrl.searchParams.get("symbol") || "").trim().toUpperCase();
  if (!symbol) return NextResponse.json({ error: "symbol requerido" }, { status: 400 });
  try {
    const p = getMarketDataProvider();
    const [quote, dividends, summary] = await Promise.all([
      p.getQuote(symbol),
      typeof (p as { getDividends?: (s: string) => Promise<Array<{ date: string; amount: number }>> }).getDividends === "function"
        ? (p as { getDividends: (s: string) => Promise<Array<{ date: string; amount: number }>> }).getDividends(symbol)
        : freeYahooDividends(symbol),
      freeYahooSummary(symbol),
    ]);
    return NextResponse.json({
      quote,
      profile: quote ? { name: quote.name, exchange: quote.exchange, country: quote.region } : null,
      history: [],
      stats: { pe: summary.pe, peg: summary.peg, pb: summary.pb, ps: summary.ps, marketCap: summary.marketCap, high52: summary.high52, low52: summary.low52 },
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
      assetType: undefined,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
