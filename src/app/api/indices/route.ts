import { NextResponse } from "next/server";
import { getMarketDataProvider } from "@/lib/market-data";

export const dynamic = "force-dynamic";

/**
 * GET /api/indices
 */
export async function GET() {
  try {
    const provider = getMarketDataProvider();
    const indices = provider.getIndices
      ? await provider.getIndices()
      : [];

    return NextResponse.json({
      indices,
      count: indices.length,
      usingRealData: indices.length > 0 && indices.every((index) => index.source !== "mock"),
      provider: provider.name,
    });
  } catch (err) {
    console.error("API /indices error:", err);
    return NextResponse.json(
      { error: "Error al obtener índices" },
      { status: 500 }
    );
  }
}
