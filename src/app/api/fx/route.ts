import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/fx — USD/MXN lo más actualizado posible (gratis)
 */
export async function GET() {
  let usdMxn: number | null = null;
  let source = "";
  let asOf: string | null = null;

  // 1) Yahoo Finance USD/MXN (más cercano a mercado)
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/MXN=X?interval=1m&range=1d",
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 60 },
      }
    );
    if (res.ok) {
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      const price =
        meta?.regularMarketPrice ??
        meta?.previousClose ??
        data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.slice(-1)?.[0];
      // MXN=X en Yahoo is often USD per MXN or MXN per USD?
      // Symbol MXN=X is typically how many MXN per 1 USD when using some feeds;
      // Yahoo's MXN=X is USD/MXN inverted in some cases.
      // Actually Yahoo ticker "MXN=X" = USD to MXN (pesos per dollar) when price ~17-20.
      if (price != null && Number(price) > 5 && Number(price) < 50) {
        usdMxn = Number(price);
        source = "yahoo";
        asOf = new Date().toISOString();
      } else if (price != null && Number(price) > 0 && Number(price) < 1) {
        // inverted
        usdMxn = 1 / Number(price);
        source = "yahoo";
        asOf = new Date().toISOString();
      }
    }
  } catch {
    /* */
  }

  // 2) open.er-api
  if (usdMxn == null) {
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD", {
        next: { revalidate: 300 },
      });
      if (res.ok) {
        const data = await res.json();
        const rate = data?.rates?.MXN;
        if (rate != null && Number(rate) > 0) {
          usdMxn = Number(rate);
          source = "open.er-api";
          asOf = data.time_last_update_utc || null;
        }
      }
    } catch {
      /* */
    }
  }

  // 3) Frankfurter
  if (usdMxn == null) {
    try {
      const res = await fetch(
        "https://api.frankfurter.dev/v1/latest?base=USD&symbols=MXN",
        { next: { revalidate: 3600 } }
      );
      if (res.ok) {
        const data = await res.json();
        const rate = data?.rates?.MXN;
        if (rate != null && Number(rate) > 0) {
          usdMxn = Number(rate);
          source = "frankfurter";
          asOf = data.date || null;
        }
      }
    } catch {
      /* */
    }
  }

  if (usdMxn == null) {
    return NextResponse.json(
      { error: "No se pudo obtener el tipo de cambio", usdMxn: null, mxnUsd: null },
      { status: 502 }
    );
  }

  return NextResponse.json({
    usdMxn,
    mxnUsd: 1 / usdMxn,
    source,
    asOf,
    usingRealData: true,
  });
}
