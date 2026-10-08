import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/risk-free
 * Tasa libre de riesgo aproximada:
 * - US: yield ^IRX (13-week T-bill) vía Yahoo
 * - MX: proxy CETES 28d (si falla → estimado)
 */
export async function GET() {
  let us: number | null = null;
  let mx: number | null = null;
  let sourceUs = "";
  let sourceMx = "";

  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/%5EIRX?interval=1d&range=5d",
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 3600 },
      }
    );
    if (res.ok) {
      const d = await res.json();
      const price = d?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price != null) {
        // ^IRX se cotiza en % (ej. 4.25)
        us = Number(price);
        sourceUs = "yahoo:^IRX";
      }
    }
  } catch {
    /* */
  }

  // México: intentar Banxico vía serie vía Yahoo no siempre existe.
  // Fallback: US + prima país ~3–4 pp o valor de referencia.
  try {
    // Algunos usan CETETRC=MF como proxy; si no, estimación
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/CETETRC%3DMF?interval=1d&range=5d",
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 3600 },
      }
    );
    if (res.ok) {
      const d = await res.json();
      const price = d?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price != null && Number(price) > 0 && Number(price) < 30) {
        mx = Number(price);
        sourceMx = "yahoo:CETETRC";
      }
    }
  } catch {
    /* */
  }

  if (mx == null) {
    // Prima aproximada sobre T-bill US (no es dato oficial)
    mx = us != null ? us + 4.5 : 9.5;
    sourceMx = us != null ? "estimado:US+4.5pp" : "estimado:9.5";
  }
  if (us == null) {
    us = 4.3;
    sourceUs = "estimado:4.3";
  }

  return NextResponse.json({
    usAnnualPct: us,
    mxAnnualPct: mx,
    sourceUs,
    sourceMx,
    note: "Aproximaciones educativas. CETES/T-bill reales pueden diferir.",
  });
}
