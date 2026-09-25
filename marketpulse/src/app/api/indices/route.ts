import { NextResponse } from "next/server";
import { YahooProvider } from "@/lib/market-data/yahoo-provider";
import { MockProvider } from "@/lib/market-data/mock-provider";
export async function GET() {
  const y = new YahooProvider();
  const m = new MockProvider();
  const indices = (await y.getIndices()).length ? await y.getIndices() : await m.getIndices();
  return NextResponse.json({ indices, count: indices.length, usingRealData: indices.length > 0, provider: "yahoo|mock" });
}
