import { NextRequest, NextResponse } from "next/server";
import { searchMxUniverse } from "@/lib/mx-universe";
import { freeYahooSearch } from "@/lib/free-finance";
import { isExcludedInstrument, normalizeYahooSymbol } from "@/lib/market-data/types";
import { withCachePolicy } from "@/lib/http-cache";

export const dynamic = "force-dynamic";

/**
 * GET /api/search?q=apple
 * Primero busca en BMV/BIVA/SIC; Yahoo amplía la búsqueda si el catálogo local
 * no devuelve coincidencias. Forex y cripto no se incluyen.
 */
async function get(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim().slice(0, 40);
  if (!q) {
    return NextResponse.json(
      { error: "Parámetro 'q' requerido" },
      { status: 400 }
    );
  }

  try {
    const localResults = searchMxUniverse(q, 20);
    const publicResults = localResults.length < 10 ? await freeYahooSearch(q) : [];
    const seen = new Set<string>();
    const results = [...localResults, ...publicResults]
      .filter((result) => {
        const symbol = normalizeYahooSymbol(result.symbol);
        if (!symbol || isExcludedInstrument(symbol, result.type)) return false;
        if (seen.has(symbol)) return false;
        seen.add(symbol);
        result.symbol = symbol;
        return true;
      })
      .slice(0, 20);

    return NextResponse.json(
      {
        results,
        count: results.length,
        universe: "BMV+BIVA+SIC+Yahoo-public",
        usingRealData: true,
        provider: publicResults.length ? "sic+yahoo" : "sic",
        hint:
          results.length === 0
            ? "No se encontró el símbolo en el catálogo ni en Yahoo Finance."
            : undefined,
      }
    );
  } catch (err) {
    console.error("API /search error:", err);
    return NextResponse.json(
      { error: "Error en la búsqueda" },
      { status: 500 }
    );
  }
}

export const GET = withCachePolicy("/api/search", get);
