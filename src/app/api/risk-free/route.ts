import { NextResponse } from "next/server";
import { publicFredCsv } from "@/lib/free-finance";

export const dynamic = "force-dynamic";

/**
 * Tasa libre de riesgo aproximada: Treasury/FRED (pública, sin key) primero;
 * Yahoo ^IRX queda como respaldo. La tasa MX es un proxy educativo.
 */
export async function GET() {
  let us: number | null = null;
  let mx: number | null = null;
  let sourceUs = "";
  let sourceMx = "";

  const fred = await publicFredCsv("DGS3MO", 30);
  const fredValue = fred?.latest?.value;
  if (fredValue != null && Number.isFinite(fredValue) && fredValue > 0) {
    us = fredValue;
    sourceUs = `fred:${fred?.series || "DGS3MO"}`;
  }

  if (us == null) {
    try {
      const res = await fetch(
        "https://query1.finance.yahoo.com/v8/finance/chart/%5EIRX?interval=1d&range=5d",
        { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 3600 } }
      );
      if (res.ok) {
        const data = await res.json();
        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (price != null && Number(price) > 0) {
          us = Number(price);
          sourceUs = "yahoo:^IRX";
        }
      }
    } catch {
      // Usa el valor conservador de referencia más abajo.
    }
  }

  // Sin una serie CETES pública anónima y estable, MX se etiqueta como proxy.
  if (us != null) {
    mx = us + 4.5;
    sourceMx = "estimado:US+4.5pp";
  } else {
    us = 4.3;
    mx = 9.5;
    sourceUs = "estimado:4.3";
    sourceMx = "estimado:9.5";
  }

  return NextResponse.json(
    {
      usAnnualPct: us,
      mxAnnualPct: mx,
      sourceUs,
      sourceMx,
      source: fred?.latest?.value != null ? "fred-treasury" : sourceUs,
      note: "FRED publica el Treasury a 3 meses. La referencia mexicana es un diferencial estimado, no una tasa CETES oficial.",
    },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" } }
  );
}
