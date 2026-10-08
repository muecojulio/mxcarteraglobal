import { NextRequest, NextResponse } from "next/server";
import { freeNasdaqCalendar } from "@/lib/free-finance";
import { isExcludedInstrument, normalizeYahooSymbol } from "@/lib/market-data/types";
import { sanitizeSymbolList } from "@/lib/sanitize";

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
  const symbols = [...new Set(
    sanitizeSymbolList(req.nextUrl.searchParams.get("symbols"), 40)
      .map(normalizeYahooSymbol)
      .filter((symbol) => !isExcludedInstrument(symbol))
  )];

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

  // Calendarios públicos Nasdaq primero; las claves existentes son respaldo.
  try {
    const [earningRows, dividendRows] = await Promise.all([
      freeNasdaqCalendar(from, to, "earnings"),
      freeNasdaqCalendar(from, to, "dividends"),
    ]);
    for (const value of earningRows) {
      if (!value || typeof value !== "object") continue;
      const row = value as Record<string, unknown>;
      const sym = normalizeYahooSymbol(String(row.symbol || row.ticker || ""));
      const date = String(row.date || row.reportDate || row.earningsDate || "").slice(0, 10);
      if (!set.has(sym) || isExcludedInstrument(sym) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      events.push({
        id: `earn-nasdaq-${sym}-${date}`,
        date,
        symbol: sym,
        type: "earnings",
        title: `Resultados ${sym}`,
        detail: row.epsForecast != null ? `EPS est. ${row.epsForecast}` : undefined,
        source: "nasdaq-public",
      });
    }
    for (const value of dividendRows) {
      if (!value || typeof value !== "object") continue;
      const row = value as Record<string, unknown>;
      const sym = normalizeYahooSymbol(String(row.symbol || row.ticker || ""));
      const date = String(row.exOrEffDate || row.exDate || row.date || "").slice(0, 10);
      if (!set.has(sym) || isExcludedInstrument(sym) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const amount = row.amount ?? row.dividend ?? row.dividendAmount;
      events.push({
        id: `div-nasdaq-${sym}-${date}`,
        date,
        symbol: sym,
        type: "dividend",
        title: `Dividendo ${sym}`,
        amount: amount != null && Number.isFinite(Number(amount)) ? Number(amount) : null,
        detail: row.paymentDate ? `Pago: ${row.paymentDate}` : undefined,
        source: "nasdaq-public",
      });
    }
  } catch {
    /* Continúa con respaldos configurados. */
  }

  const missingEarnings = symbols.some((symbol) => !events.some((event) => event.type === "earnings" && event.symbol === symbol));
  if (finnhub && missingEarnings) {
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${finnhub}`,
        { next: { revalidate: 3600 } }
      );
      if (res.ok) {
        const data = await res.json();
        for (const e of data.earningsCalendar || []) {
          const sym = normalizeYahooSymbol(String(e.symbol || ""));
          if (!set.has(sym) || events.some((event) => event.type === "earnings" && event.symbol === sym) || !e.date) continue;
          events.push({
            id: `earn-fh-${sym}-${e.date}`,
            date: e.date,
            symbol: sym,
            type: "earnings",
            title: `Resultados ${sym}`,
            detail: e.hour === "bmo" ? "Antes de mercado" : e.hour === "amc" ? "Después de mercado" : e.hour || undefined,
                source: "finnhub",
          });
        }
      }
    } catch {
      /* */
    }
  }

  const missingDividends = symbols.some((symbol) => !events.some((event) => event.type === "dividend" && event.symbol === symbol));
  if (fmp && missingDividends) {
    try {
      const res = await fetch(
        `https://financialmodelingprep.com/stable/dividends-calendar?from=${from}&to=${to}&apikey=${fmp}`,
        { next: { revalidate: 3600 } }
      );
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) for (const d of list) {
          const sym = normalizeYahooSymbol(String(d.symbol || ""));
          if (!set.has(sym) || events.some((event) => event.type === "dividend" && event.symbol === sym) || !d.date) continue;
          const amount = d.adjDividend ?? d.dividend;
          events.push({
            id: `div-fmp-${sym}-${d.date}`,
            date: d.date,
            symbol: sym,
            type: "dividend",
            title: `Dividendo ${sym}`,
            amount: amount != null && Number.isFinite(Number(amount)) ? Number(amount) : null,
            detail: d.paymentDate ? `Pago: ${d.paymentDate}` : undefined,
                source: "fmp-fallback",
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
