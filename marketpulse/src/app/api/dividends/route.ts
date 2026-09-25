import { NextRequest, NextResponse } from "next/server";
export async function GET(req: NextRequest) {
  const symbol = (req.nextUrl.searchParams.get("symbol") || "").toUpperCase();
  return NextResponse.json({ symbol, region: symbol.endsWith(".MX") ? "MX" : "US", dividends: [], count: 0, usingRealData: false, source: "none" });
}
