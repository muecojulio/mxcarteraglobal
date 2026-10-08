import { NextRequest, NextResponse } from "next/server";
import { getCompositeProvider, detectRegion } from "@/lib/market-data";

export const dynamic = "force-dynamic";

/**
 * CAGR entre dos montos anuales de dividendo.
 * periods = número de años entre mediciones.
 */
function cagr(start: number, end: number, periods: number): number | null {
  if (start <= 0 || end <= 0 || periods <= 0) return null;
  return (Math.pow(end / start, 1 / periods) - 1) * 100;
}

/**
 * Agrupa dividendos por año calendario (suma de pagos del año).
 */
function annualTotals(
  dividends: Array<{ date: string; amount: number }>
): Map<number, number> {
  const map = new Map<number, number>();
  for (const d of dividends) {
    const y = parseInt(String(d.date).slice(0, 4), 10);
    if (!Number.isFinite(y)) continue;
    map.set(y, (map.get(y) || 0) + Number(d.amount || 0));
  }
  return map;
}

/**
 * GET /api/dividend-growth?symbol=AAPL
 * Devuelve crecimiento de dividendos 1A, 3A, 5A, 10A (%)
 */
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) {
    return NextResponse.json(
      { error: "Parámetro symbol requerido" },
      { status: 400 }
    );
  }

  const sym = symbol.toUpperCase();
  const region = detectRegion(sym);
  const finnhub = process.env.FINNHUB_API_KEY?.trim();

  try {
    const provider = getCompositeProvider();
    const dividends = await provider.getDividends(sym);
    // orden: más reciente primero suele venir así
    const sorted = [...dividends].sort((a, b) =>
      String(b.date).localeCompare(String(a.date))
    );

    const byYear = annualTotals(
      sorted.map((d) => ({ date: d.date, amount: d.amount }))
    );
    const years = [...byYear.keys()].sort((a, b) => b - a); // desc
    const latestYear = years[0];
    const latestAnnual = latestYear != null ? byYear.get(latestYear)! : 0;

    function growthOver(n: number): number | null {
      if (!latestYear || latestAnnual <= 0) return null;
      const pastYear = latestYear - n;
      const past = byYear.get(pastYear);
      if (past == null || past <= 0) {
        // buscar el año más cercano disponible hacia atrás
        const candidates = years.filter((y) => y <= pastYear);
        if (!candidates.length) return null;
        const y = candidates[0];
        const p = byYear.get(y)!;
        const periods = latestYear - y;
        if (periods < 1) return null;
        return cagr(p, latestAnnual, periods);
      }
      return cagr(past, latestAnnual, n);
    }

    let growth1Y = growthOver(1);
    let growth3Y = growthOver(3);
    let growth5Y = growthOver(5);
    let growth10Y = growthOver(10);

    // Finnhub a veces trae dividendGrowthRate5Y oficial
    let finnhub5Y: number | null = null;
    if (finnhub && region === "US") {
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(
            sym
          )}&metric=all&token=${finnhub}`,
          { next: { revalidate: 86400 } }
        );
        if (res.ok) {
          const data = await res.json();
          const m = data.metric || {};
          if (m.dividendGrowthRate5Y != null) {
            finnhub5Y = Number(m.dividendGrowthRate5Y);
            // si no pudimos calcular 5A, usar Finnhub
            if (growth5Y == null) growth5Y = finnhub5Y;
          }
        }
      } catch {
        /* */
      }
    }

    return NextResponse.json({
      symbol: sym,
      region,
      latestYear,
      latestAnnual,
      growth: {
        "1Y": growth1Y,
        "3Y": growth3Y,
        "5Y": growth5Y,
        "10Y": growth10Y,
      },
      finnhub5Y,
      yearsAvailable: years.length,
      source: "dividends-history+finnhub",
    });
  } catch (err) {
    console.error("dividend-growth error:", err);
    return NextResponse.json(
      { error: "Error al calcular crecimiento" },
      { status: 500 }
    );
  }
}
