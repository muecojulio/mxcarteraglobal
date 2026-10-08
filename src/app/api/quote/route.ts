import { NextRequest, NextResponse } from "next/server";
import { sanitizeSymbol } from "@/lib/sanitize";
import { getMarketDataProvider } from "@/lib/market-data";
import { withCachePolicy } from "@/lib/http-cache";

export const dynamic = "force-dynamic";

/**
 * GET /api/quote?symbol=AAPL
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
    const provider = getMarketDataProvider();
    const quote = await provider.getQuote(symbol);

    if (!quote) {
      return NextResponse.json(
        { error: `No se encontró cotización para ${symbol}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...quote,
      usingRealData: quote.source !== "mock",
    });
  } catch (err) {
    console.error("API /quote error:", err);
    return NextResponse.json(
      { error: "Error al obtener cotización" },
      { status: 500 }
    );
  }
}

export const GET = withCachePolicy("/api/quote", get);
