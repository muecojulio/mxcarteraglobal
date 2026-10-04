import { NextRequest, NextResponse } from "next/server";
import { sanitizeSymbol } from "@/lib/sanitize";

export async function GET(req: NextRequest) {
  const symbol = sanitizeSymbol(req.nextUrl.searchParams.get("symbol")) || "";
  return NextResponse.json({ symbol, region: symbol.endsWith(".MX") ? "MX" : "US", dividends: [], count: 0, usingRealData: false, source: "none" });
}
