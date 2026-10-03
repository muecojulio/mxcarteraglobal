import { NextRequest, NextResponse } from "next/server";
import { YahooProvider } from "@/lib/market-data/yahoo-provider";
import { MockProvider } from "@/lib/market-data/mock-provider";
export async function GET(req: NextRequest) {
  const symbols = (req.nextUrl.searchParams.get("symbols") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const y = new YahooProvider();
  const m = new MockProvider();
  const quotes = (await y.getQuotes(symbols)).length ? await y.getQuotes(symbols) : await m.getQuotes(symbols);
  return NextResponse.json({ quotes, count: quotes.length, usingRealData: quotes.some((q) => q.source !== "mock"), provider: quotes[0]?.source || "mock" });
}
