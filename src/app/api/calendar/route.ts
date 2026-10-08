import { NextRequest, NextResponse } from "next/server";
import { freeNasdaqCalendar, publicSecRecentIpos } from "@/lib/free-finance";
import { isExcludedInstrument, normalizeYahooSymbol } from "@/lib/market-data/types";
import { withCachePolicy } from "@/lib/http-cache";

export const dynamic = "force-dynamic";

type CalendarEvent = {
  id: string;
  date: string;
  symbol?: string;
  title: string;
  type: "earnings" | "dividend" | "ipo" | "market" | "delisting";
  region: "US" | "MX" | "GLOBAL";
  detail?: string;
  source: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function get(req: NextRequest) {
  const from =
    req.nextUrl.searchParams.get("from") || todayISO();
  const to =
    req.nextUrl.searchParams.get("to") || addDays(from, 21);
  const type = req.nextUrl.searchParams.get("type") || "all";

  const finnhub = process.env.FINNHUB_API_KEY?.trim();
  const fmp = process.env.FMP_API_KEY?.trim();
  const events: CalendarEvent[] = [];

  try {
    // Calendario público Nasdaq primero; respaldos con claves solo se consultan
    // si la fuente pública no devuelve eventos para ese tipo.
    if (type === "all" || type === "earnings") {
      const rows = await freeNasdaqCalendar(from, to, "earnings");
      for (const value of rows.slice(0, 100)) {
        if (!value || typeof value !== "object") continue;
        const row = value as Record<string, unknown>;
        const symbol = normalizeYahooSymbol(String(row.symbol || row.ticker || ""));
        const date = String(row.date || row.reportDate || row.earningsDate || "").slice(0, 10);
        if (!symbol || isExcludedInstrument(symbol) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
        events.push({
          id: `earn-nasdaq-${symbol}-${date}`,
          date,
          symbol,
          title: `Resultados ${symbol}`,
          type: "earnings",
          region: "US",
          detail: row.epsForecast != null ? `EPS est. ${row.epsForecast}` : undefined,
          source: "nasdaq-public",
        });
      }
      if (!events.some((event) => event.type === "earnings") && finnhub) {
        try {
          const res = await fetch(
            `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${finnhub}`,
            { next: { revalidate: 3600 } }
          );
          if (res.ok) {
            const data = await res.json();
            for (const e of (data.earningsCalendar || []).slice(0, 80)) {
              const symbol = normalizeYahooSymbol(String(e.symbol || ""));
              if (!symbol || isExcludedInstrument(symbol) || !e.date) continue;
              events.push({
                id: `earn-fh-${symbol}-${e.date}`,
                date: e.date,
                symbol,
                title: `Resultados ${symbol}`,
                type: "earnings",
                region: "US",
                detail: e.epsEstimate != null ? `EPS est. ${e.epsEstimate}` : undefined,
                source: "finnhub",
              });
            }
          }
        } catch {
          /* */
        }
      }
      if (!events.some((event) => event.type === "earnings") && fmp) {
        try {
          const res = await fetch(
            `https://financialmodelingprep.com/stable/earnings-calendar?from=${from}&to=${to}&apikey=${fmp}`,
            { next: { revalidate: 3600 } }
          );
          if (res.ok) {
            const list = await res.json();
            if (Array.isArray(list)) for (const e of list.slice(0, 80)) {
              const symbol = normalizeYahooSymbol(String(e.symbol || ""));
              if (!symbol || isExcludedInstrument(symbol) || !e.date) continue;
              events.push({
                id: `earn-fmp-${symbol}-${e.date}`,
                date: e.date,
                symbol,
                title: `Resultados ${symbol}`,
                type: "earnings",
                region: "US",
                detail: e.epsEstimated != null ? `EPS est. ${e.epsEstimated}` : undefined,
                source: "fmp-fallback",
              });
            }
          }
        } catch {
          /* */
        }
      }
    }

    if (type === "all" || type === "dividend") {
      const rows = await freeNasdaqCalendar(from, to, "dividends");
      for (const value of rows.slice(0, 100)) {
        if (!value || typeof value !== "object") continue;
        const row = value as Record<string, unknown>;
        const symbol = normalizeYahooSymbol(String(row.symbol || row.ticker || ""));
        const date = String(row.exOrEffDate || row.exDate || row.date || "").slice(0, 10);
        if (!symbol || isExcludedInstrument(symbol) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
        const amount = row.amount ?? row.dividend ?? row.dividendAmount;
        events.push({
          id: `div-nasdaq-${symbol}-${date}`,
          date,
          symbol,
          title: `Dividendo ${symbol}`,
          type: "dividend",
          region: "US",
          detail: amount != null ? `$${amount}` : undefined,
          source: "nasdaq-public",
        });
      }
      if (!events.some((event) => event.type === "dividend") && fmp) {
        try {
          const res = await fetch(
            `https://financialmodelingprep.com/stable/dividends-calendar?from=${from}&to=${to}&apikey=${fmp}`,
            { next: { revalidate: 3600 } }
          );
          if (res.ok) {
            const list = await res.json();
            if (Array.isArray(list)) for (const d of list.slice(0, 100)) {
              const symbol = normalizeYahooSymbol(String(d.symbol || ""));
              if (!symbol || isExcludedInstrument(symbol) || !d.date) continue;
              const amount = d.adjDividend ?? d.dividend;
              events.push({
                id: `div-fmp-${symbol}-${d.date}`,
                date: d.date,
                symbol,
                title: `Dividendo ${symbol}`,
                type: "dividend",
                region: "US",
                detail: amount != null ? `$${amount}` : undefined,
                source: "fmp-fallback",
              });
            }
          }
        } catch {
          /* */
        }
      }
    }

    if (type === "all" || type === "ipo") {
      const rows = await freeNasdaqCalendar(from, to, "ipo");
      for (const value of rows.slice(0, 60)) {
        if (!value || typeof value !== "object") continue;
        const row = value as Record<string, unknown>;
        const symbol = normalizeYahooSymbol(String(row.symbol || row.ticker || ""));
        const date = String(row.date || row.pricingDate || row.expectedDate || row.fileDate || "").slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
        events.push({
          id: `ipo-nasdaq-${symbol || row.companyName}-${date}`,
          date,
          ...(symbol && !isExcludedInstrument(symbol) ? { symbol } : {}),
          title: String(row.companyName || row.name || (symbol ? `IPO ${symbol}` : "IPO")),
          type: "ipo",
          region: "US",
          detail: [row.exchange, row.price, row.status].filter(Boolean).join(" · ") || undefined,
          source: "nasdaq-public",
        });
      }
      if (!events.some((event) => event.type === "ipo")) {
        const secRows = await publicSecRecentIpos(from, to);
        for (const filing of secRows.slice(0, 50)) {
          events.push({
            id: `ipo-sec-${filing.symbol || filing.name}-${filing.date}`,
            date: filing.date,
            ...(filing.symbol ? { symbol: filing.symbol } : {}),
            title: `Filings S-1: ${filing.name}`,
            type: "ipo",
            region: "US",
            detail: "Registro SEC; no es confirmación de salida a bolsa.",
            source: "sec-edgar-filing",
          });
        }
      }
      if (!events.some((event) => event.type === "ipo") && finnhub) {
        try {
          const res = await fetch(
            `https://finnhub.io/api/v1/calendar/ipo?from=${from}&to=${to}&token=${finnhub}`,
            { next: { revalidate: 3600 } }
          );
          if (res.ok) {
            const data = await res.json();
            for (const ipo of (data.ipoCalendar || []).slice(0, 30)) {
              if (!ipo.date) continue;
              const symbol = normalizeYahooSymbol(String(ipo.symbol || ""));
              events.push({
                id: `ipo-fh-${symbol || ipo.name}-${ipo.date}`,
                date: ipo.date,
                ...(symbol && !isExcludedInstrument(symbol) ? { symbol } : {}),
                title: ipo.name || `IPO ${symbol}`,
                type: "ipo",
                region: "US",
                detail: [ipo.exchange, ipo.price, ipo.status].filter(Boolean).join(" · ") || undefined,
                source: "finnhub",
              });
            }
          }
        } catch {
          /* */
        }
      }
    }

    // Deslistados (acciones / ETF) — FMP
    // Nota: la mayoría son fechas ya ocurridas o anunciadas; cobertura MX/FIBRA limitada en APIs gratis
    if ((type === "all" || type === "delisting") && fmp) {
      try {
        const res = await fetch(
          `https://financialmodelingprep.com/stable/delisted-companies?page=0&apikey=${fmp}`,
          { next: { revalidate: 86400 } }
        );
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            const fromT = new Date(from + "T00:00:00").getTime();
            const toT = new Date(to + "T23:59:59").getTime();
            // ventana ampliada: 90 días atrás + rango pedido (avisos recientes)
            const fromWide = fromT - 90 * 86400000;
            for (const d of list.slice(0, 200)) {
              const dateStr = (d.delistedDate || d.date || "").slice(0, 10);
              const symbol = normalizeYahooSymbol(String(d.symbol || ""));
              if (!dateStr || !symbol || isExcludedInstrument(symbol)) continue;
              const t0 = new Date(dateStr + "T12:00:00").getTime();
              if (t0 < fromWide || t0 > toT) continue;
              const kind = String(d.exchange || d.assetType || "").toLowerCase();
              let label = "Acción";
              if (kind.includes("etf") || String(d.symbol).includes("ETF")) label = "ETF";
              if (kind.includes("fund")) label = "Fondo";
              events.push({
                id: `delist-${symbol}-${dateStr}`,
                date: dateStr,
                symbol,
                title: `Desliste ${label}: ${symbol}`,
                type: "delisting",
                region: "US",
                detail: [d.companyName || d.name, d.exchange]
                  .filter(Boolean)
                  .join(" · "),
                source: "fmp",
              });
            }
          }
        }
      } catch {
        /* ignore */
      }
    }

    // Eventos de mercado fijos (referencia)
    if (type === "all" || type === "market") {
      events.push(
        {
          id: "mkt-mx-close",
          date: from,
          title: "Cierre BMV (México)",
          type: "market",
          region: "MX",
          detail: "15:00 CDMX (días hábiles)",
          source: "reference",
        },
        {
          id: "mkt-us-close",
          date: from,
          title: "Cierre NYSE / Nasdaq",
          type: "market",
          region: "US",
          detail: "16:00 ET (días hábiles)",
          source: "reference",
        }
      );
    }

    events.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      from,
      to,
      events,
      count: events.length,
      sources: [
        "nasdaq-public",
        "sec-edgar",
        finnhub && "finnhub-fallback",
        fmp && "fmp-fallback",
        "reference",
      ].filter(Boolean),
    });
  } catch (err) {
    console.error("Calendar API error:", err);
    return NextResponse.json(
      { error: "Error al cargar calendario", events: [], count: 0 },
      { status: 500 }
    );
  }
}

export const GET = withCachePolicy("/api/calendar", get);
