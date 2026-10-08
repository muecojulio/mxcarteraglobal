import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/portfolio-dividends?symbols=AAPL,MSFT,AMXL.MX
 * Próximos dividendos del calendario filtrados a esos símbolos (FMP, principalmente US)
 * + opcionalmente no calcula growth aquí (el cliente llama dividend-growth por símbolo)
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("symbols") || "";
  const symbols = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 40);

  const fmp = process.env.FMP_API_KEY?.trim();
  if (!fmp) {
    return NextResponse.json({
      upcoming: [],
      error: "FMP_API_KEY no configurada",
    });
  }

  const from = new Date().toISOString().slice(0, 10);
  const toDate = new Date();
  toDate.setDate(toDate.getDate() + 90);
  const to = toDate.toISOString().slice(0, 10);

  try {
    const res = await fetch(
      `https://financialmodelingprep.com/stable/dividends-calendar?from=${from}&to=${to}&apikey=${fmp}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) {
      return NextResponse.json({
        upcoming: [],
        error: `FMP HTTP ${res.status}`,
      });
    }
    const list = await res.json();
    if (!Array.isArray(list)) {
      return NextResponse.json({ upcoming: [], error: "Respuesta inválida" });
    }

    const set = new Set(symbols);
    const upcoming = list
      .filter((d: { symbol?: string }) =>
        d.symbol ? set.has(String(d.symbol).toUpperCase()) : false
      )
      .map(
        (d: {
          symbol: string;
          date: string;
          dividend?: number;
          adjDividend?: number;
          paymentDate?: string;
          recordDate?: string;
        }) => ({
          symbol: d.symbol,
          exDate: d.date,
          amount: d.adjDividend ?? d.dividend ?? null,
          paymentDate: d.paymentDate,
          recordDate: d.recordDate,
        })
      )
      .sort((a: { exDate: string }, b: { exDate: string }) =>
        a.exDate.localeCompare(b.exDate)
      );

    return NextResponse.json({
      from,
      to,
      symbols,
      upcoming,
      count: upcoming.length,
    });
  } catch (err) {
    console.error("portfolio-dividends error:", err);
    return NextResponse.json(
      { upcoming: [], error: "Error al cargar calendario" },
      { status: 500 }
    );
  }
}
