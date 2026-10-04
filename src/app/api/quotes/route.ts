import { NextRequest, NextResponse } from "next/server";
import { YahooProvider } from "@/lib/market-data/yahoo-provider";
import { MockProvider } from "@/lib/market-data/mock-provider";
import { sanitizeSymbolList } from "@/lib/sanitize";

export async function GET(req: NextRequest) {
  const symbols = sanitizeSymbolList(req.nextUrl.searchParams.get("symbols"), 40);
  const y = new YahooProvider();
  const m = new MockProvider();
  const quotes = (await y.getQuotes(symbols)).length ? await y.getQuotes(symbols) : await m.getQuotes(symbols);
  return NextResponse.json({ quotes, count: quotes.length, usingRealData: quotes.some((q) => q.source !== "mock"), provider: quotes[0]?.source || "mock" });
}
