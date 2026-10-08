import { NextRequest, NextResponse } from "next/server";
import { getMarketDataProvider, isUsingRealData } from "@/lib/market-data";
import { sanitizeSymbolList } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

/**
 * GET /api/quotes?symbols=AAPL,MSFT,AMXL.MX
 */
export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get("symbols")?.trim();

  if (!symbolsParam) {
    return NextResponse.json(
      { error: "Parámetro 'symbols' requerido (separados por coma)" },
      { status: 400 }
    );
  }

  const symbols = sanitizeSymbolList(symbolsParam, 40);

  if (symbols.length === 0) {
    return NextResponse.json(
      { error: "Ningún símbolo válido" },
      { status: 400 }
    );
  }

  try {
    const provider = getMarketDataProvider();
    const quotes = await provider.getQuotes(symbols);

    return NextResponse.json({
      quotes,
      count: quotes.length,
      usingRealData: isUsingRealData(),
      provider: provider.name,
    });
  } catch (err) {
    console.error("API /quotes error:", err);
    return NextResponse.json(
      { error: "Error al obtener cotizaciones" },
      { status: 500 }
    );
  }
}
