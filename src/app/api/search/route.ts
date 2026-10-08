import { NextRequest, NextResponse } from "next/server";
import { searchMxUniverse, isInMxUniverse } from "@/lib/mx-universe";

export const dynamic = "force-dynamic";

/**
 * GET /api/search?q=apple
 * Solo BMV, BIVA y SIC (universo México).
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim().slice(0, 40);

  if (!q || q.length < 1) {
    return NextResponse.json(
      { error: "Parámetro 'q' requerido" },
      { status: 400 }
    );
  }

  try {
    const results = searchMxUniverse(q, 20);

    return NextResponse.json({
      results,
      count: results.length,
      universe: "BMV+BIVA+SIC",
      usingRealData: true,
      provider: "mx-universe",
      hint:
        results.length === 0
          ? "No está en el catálogo BMV / BIVA / SIC de la app. Puedes ampliar el catálogo más adelante."
          : undefined,
    });
  } catch (err) {
    console.error("API /search error:", err);
    return NextResponse.json(
      { error: "Error en la búsqueda" },
      { status: 500 }
    );
  }
}
