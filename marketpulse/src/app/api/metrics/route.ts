import { NextRequest, NextResponse } from "next/server";
import { freeYahooSummary } from "@/lib/free-finance";
import { detectRegion } from "@/lib/market-data/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("symbols") || "AAPL,MSFT,AMXL.MX";
  const symbols = raw.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 12);
  const rows = [];
  for (const symbol of symbols) {
    const s = await freeYahooSummary(symbol);
    const region = detectRegion(symbol);
    rows.push({
      symbol,
      name: symbol,
      type: "stock" as const,
      region: region === "MX" ? "MX" : "US",
      currency: region === "MX" ? "MXN" : "USD",
      price: s.price,
      pe: s.pe,
      peg: s.peg,
      pb: s.pb,
      roe: s.roe,
      divYieldPct: s.divYield,
      undervalued: s.pe != null ? s.pe < 15 : null,
    });
  }
  return NextResponse.json({ rows });
}
