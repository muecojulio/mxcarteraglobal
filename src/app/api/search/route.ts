import { NextRequest, NextResponse } from "next/server";
import { YahooProvider } from "@/lib/market-data/yahoo-provider";
import { MockProvider } from "@/lib/market-data/mock-provider";
import { searchMx } from "@/lib/mx-universe";
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const y = new YahooProvider();
  const remote = await y.search(q);
  const local = searchMx(q).map((i) => ({ symbol: i.symbol, name: i.name, region: i.venue === "SIC" ? "US" : "MX", type: i.kind === "etf" ? "etf" : "stock" as const }));
  const results = remote.length ? remote : [...local, ...(await new MockProvider().search(q))];
  return NextResponse.json({ results, count: results.length, usingRealData: remote.length > 0, provider: remote.length ? "yahoo" : "local|mock" });
}
