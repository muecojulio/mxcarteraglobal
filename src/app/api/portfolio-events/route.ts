import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type EventItem = {
  id: string;
  date: string;
  symbol: string;
  type: "dividend" | "earnings" | "split";
  title: string;
  detail?: string;
  amount?: number | null;
  source: string;
};

/**
 * GET /api/portfolio-events?symbols=AAPL,MSFT,FUNO11.MX
 * Próximos dividendos, earnings y splits solo de símbolos poseídos.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("symbols") || "";
  const symbols = [
    ...new Set(
      raw
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    ),
  ].slice(0, 40);

  if (!symbols.length) {
    return NextResponse.json({
      events: [],
      error: "symbols requeridos",
    });
  }

  const set = new Set(symbols);
  const finnhub = process.env.FINNHUB_API_KEY?.trim();
  const fmp = process.env.FMP_API_KEY?.trim();
  const from = new Date().toISOString().slice(0, 10);
  const toD = new Date();
  toD.setDate(toD.getDate() + 90);
  const to = toD.toISOString().slice(0, 10);

  const events: EventItem[] = [];

  // Dividendos (FMP calendar — principalmente US)
  if (fmp) {
    try {
      const res = await fetch(
        `https://financialmodelingprep.com/stable/dividends-calendar?from=${from}&to=${to}&apikey=${fmp}`,
        { next: { revalidate: 3600 } }
      );
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          for (const d of list) {
            const sym = String(d.symbol || "").toUpperCase();
            if (!set.has(sym)) continue;
            events.push({
              id: `div-${sym}-${d.date}`,
              date: d.date,
              symbol: sym,
              type: "dividend",
              title: `Ex-dividendo ${sym}`,
              amount: d.adjDividend ?? d.dividend ?? null,
              detail: d.paymentDate
                ? `Pago: ${d.paymentDate}`
                : undefined,
              source: "fmp",
            });
          }
        }
      }
    } catch {
      /* */
    }
  }

  // Earnings — Finnhub
  if (finnhub) {
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${finnhub}`,
        { next: { revalidate: 3600 } }
      );
      if (res.ok) {
        const data = await res.json();
        const list = data.earningsCalendar || [];
        for (const e of list) {
          const sym = String(e.symbol || "").toUpperCase();
          if (!set.has(sym)) continue;
          events.push({
            id: `earn-${sym}-${e.date}`,
            date: e.date,
            symbol: sym,
            type: "earnings",
            title: `Resultados ${sym}`,
            detail:
              e.hour === "bmo"
                ? "Antes de mercado"
                : e.hour === "amc"
                ? "Después de mercado"
                : e.hour || undefined,
            source: "finnhub",
          });
        }
      }
    } catch {
      /* */
    }
  }

  // Splits — FMP stock split calendar
  if (fmp) {
    try {
      const res = await fetch(
        `https://financialmodelingprep.com/stable/splits-calendar?from=${from}&to=${to}&apikey=${fmp}`,
        { next: { revalidate: 3600 } }
      );
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          for (const s of list) {
            const sym = String(s.symbol || "").toUpperCase();
            if (!set.has(sym)) continue;
            const ratio =
              s.numerator != null && s.denominator != null
                ? `${s.numerator}:${s.denominator}`
                : s.splitRatio || "";
            events.push({
              id: `split-${sym}-${s.date}`,
              date: s.date,
              symbol: sym,
              type: "split",
              title: `Split ${sym}`,
              detail: ratio ? `Ratio ${ratio}` : undefined,
              source: "fmp",
            });
          }
        }
      }
    } catch {
      /* */
    }
  }

  // Finnhub stock split for individual symbols if FMP vacío
  if (finnhub && !events.some((e) => e.type === "split")) {
    for (const sym of symbols.filter((s) => !s.includes("."))) {
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/stock/split?symbol=${encodeURIComponent(
            sym
          )}&from=${from}&to=${to}&token=${finnhub}`,
          { next: { revalidate: 86400 } }
        );
        if (!res.ok) continue;
        const list = await res.json();
        if (!Array.isArray(list)) continue;
        for (const s of list) {
          events.push({
            id: `split-${sym}-${s.date}`,
            date: s.date,
            symbol: sym,
            type: "split",
            title: `Split ${sym}`,
            detail:
              s.fromFactor && s.toFactor
                ? `${s.fromFactor}→${s.toFactor}`
                : undefined,
            source: "finnhub",
          });
        }
      } catch {
        /* */
      }
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    from,
    to,
    symbols,
    events,
    counts: {
      dividend: events.filter((e) => e.type === "dividend").length,
      earnings: events.filter((e) => e.type === "earnings").length,
      split: events.filter((e) => e.type === "split").length,
    },
  });
}
