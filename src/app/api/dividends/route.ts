import { NextRequest, NextResponse } from "next/server";
import { sanitizeSymbol } from "@/lib/sanitize";
import { getCompositeProvider, isUsingRealData, detectRegion } from "@/lib/market-data";
import { withCachePolicy } from "@/lib/http-cache";

export const dynamic = "force-dynamic";

/**
 * GET /api/dividends?symbol=AAPL
 * GET /api/dividends?symbol=AMXL.MX
 *
 * MX → DataBursatil | US → FMP
 */
async function get(req: NextRequest) {
  const symbol = sanitizeSymbol(req.nextUrl.searchParams.get("symbol"));

  if (!symbol) {
    return NextResponse.json(
      { error: "Parámetro 'symbol' requerido" },
      { status: 400 }
    );
  }

  try {
    const provider = getCompositeProvider();
    const dividends = await provider.getDividends(symbol);
    const region = detectRegion(symbol);

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      region,
      dividends,
      count: dividends.length,
      usingRealData: isUsingRealData() && dividends.length > 0,
      source: dividends.length
        ? region === "MX"
          ? "mx/yahoo"
          : "fmp/finnhub/yahoo"
        : "none",
    });
  } catch (err) {
    console.error("API /dividends error:", err);
    return NextResponse.json(
      { error: "Error al obtener dividendos" },
      { status: 500 }
    );
  }
}

export const GET = withCachePolicy("/api/dividends", get);
