import { NextRequest, NextResponse } from "next/server";

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

export async function GET(req: NextRequest) {
  const from =
    req.nextUrl.searchParams.get("from") || todayISO();
  const to =
    req.nextUrl.searchParams.get("to") || addDays(from, 21);
  const type = req.nextUrl.searchParams.get("type") || "all";

  const finnhub = process.env.FINNHUB_API_KEY?.trim();
  const fmp = process.env.FMP_API_KEY?.trim();
  const events: CalendarEvent[] = [];

  try {
    // Earnings — Finnhub (amplio) + FMP
    if (type === "all" || type === "earnings") {
      if (finnhub) {
        const res = await fetch(
          `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${finnhub}`,
          { next: { revalidate: 3600 } }
        );
        if (res.ok) {
          const data = await res.json();
          const list = data.earningsCalendar || [];
          for (const e of list.slice(0, 80)) {
            if (!e.symbol || !e.date) continue;
            events.push({
              id: `earn-fh-${e.symbol}-${e.date}`,
              date: e.date,
              symbol: e.symbol,
              title: `Resultados ${e.symbol}`,
              type: "earnings",
              region: "US",
              detail:
                e.epsEstimate != null
                  ? `EPS est. ${e.epsEstimate}`
                  : undefined,
              source: "finnhub",
            });
          }
        }
      }
      if (fmp) {
        const res = await fetch(
          `https://financialmodelingprep.com/stable/earnings-calendar?from=${from}&to=${to}&apikey=${fmp}`,
          { next: { revalidate: 3600 } }
        );
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            for (const e of list.slice(0, 40)) {
              if (!e.symbol || !e.date) continue;
              const id = `earn-fmp-${e.symbol}-${e.date}`;
              if (events.some((x) => x.symbol === e.symbol && x.date === e.date && x.type === "earnings"))
                continue;
              events.push({
                id,
                date: e.date,
                symbol: e.symbol,
                title: `Resultados ${e.symbol}`,
                type: "earnings",
                region: "US",
                detail:
                  e.epsEstimated != null
                    ? `EPS est. ${e.epsEstimated}`
                    : undefined,
                source: "fmp",
              });
            }
          }
        }
      }
    }

    // Dividends — FMP
    if ((type === "all" || type === "dividend") && fmp) {
      const res = await fetch(
        `https://financialmodelingprep.com/stable/dividends-calendar?from=${from}&to=${to}&apikey=${fmp}`,
        { next: { revalidate: 3600 } }
      );
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          for (const d of list.slice(0, 50)) {
            if (!d.symbol || !d.date) continue;
            const amt = d.adjDividend ?? d.dividend;
            events.push({
              id: `div-${d.symbol}-${d.date}`,
              date: d.date,
              symbol: d.symbol,
              title: `Dividendo ${d.symbol}`,
              type: "dividend",
              region: "US",
              detail: amt != null ? `$${amt}` : undefined,
              source: "fmp",
            });
          }
        }
      }
    }

    // IPO — Finnhub
    if ((type === "all" || type === "ipo") && finnhub) {
      const res = await fetch(
        `https://finnhub.io/api/v1/calendar/ipo?from=${from}&to=${to}&token=${finnhub}`,
        { next: { revalidate: 3600 } }
      );
      if (res.ok) {
        const data = await res.json();
        const list = data.ipoCalendar || [];
        for (const ipo of list.slice(0, 30)) {
          if (!ipo.date) continue;
          events.push({
            id: `ipo-${ipo.symbol || ipo.name}-${ipo.date}`,
            date: ipo.date,
            symbol: ipo.symbol,
            title: ipo.name || `IPO ${ipo.symbol}`,
            type: "ipo",
            region: "US",
            detail: [ipo.exchange, ipo.price, ipo.status]
              .filter(Boolean)
              .join(" · "),
            source: "finnhub",
          });
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
              if (!dateStr || !d.symbol) continue;
              const t0 = new Date(dateStr + "T12:00:00").getTime();
              if (t0 < fromWide || t0 > toT) continue;
              const kind = String(d.exchange || d.assetType || "").toLowerCase();
              let label = "Acción";
              if (kind.includes("etf") || String(d.symbol).includes("ETF")) label = "ETF";
              if (kind.includes("fund")) label = "Fondo";
              events.push({
                id: `delist-${d.symbol}-${dateStr}`,
                date: dateStr,
                symbol: d.symbol,
                title: `Desliste ${label}: ${d.symbol}`,
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
        finnhub && "finnhub",
        fmp && "fmp",
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
