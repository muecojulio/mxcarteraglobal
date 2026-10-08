import { NextRequest, NextResponse } from "next/server";
import { freeNasdaqCalendar, publicSecRecentIpos } from "@/lib/free-finance";
import { withCachePolicy } from "@/lib/http-cache";

export const dynamic = "force-dynamic";

export type IpoItem = {
  date: string;
  symbol?: string;
  name: string;
  exchange?: string;
  price?: string;
  status?: string;
  numberOfShares?: number;
  totalSharesValue?: number;
};

function validDate(value: string | null, fallback: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? value! : fallback;
}

function numberOrUndefined(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const number = Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(number) ? number : undefined;
}

async function get(req: NextRequest) {
  const from = validDate(
    req.nextUrl.searchParams.get("from"),
    new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)
  );
  const to = validDate(
    req.nextUrl.searchParams.get("to"),
    new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10)
  );
  const status = req.nextUrl.searchParams.get("status")?.toLowerCase();

  try {
    const nasdaqRows = await freeNasdaqCalendar(from, to, "ipo");
    let list: IpoItem[] = nasdaqRows.flatMap((value) => {
      if (!value || typeof value !== "object") return [];
      const row = value as Record<string, unknown>;
      const date = String(row.date || row.pricingDate || row.expectedDate || row.fileDate || "").slice(0, 10);
      const symbol = String(row.symbol || row.ticker || "").trim();
      const name = String(row.companyName || row.name || symbol || "IPO");
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
      return [{
        date,
        ...(symbol ? { symbol } : {}),
        name,
        exchange: String(row.exchange || "NASDAQ"),
        ...(row.price != null ? { price: String(row.price) } : {}),
        status: String(row.status || "expected"),
        numberOfShares: numberOrUndefined(row.numberOfShares || row.sharesOffered),
        totalSharesValue: numberOrUndefined(row.totalSharesValue || row.dealSize),
      }];
    });
    let source = list.length ? "nasdaq" : "";

    if (!list.length) {
      const secRows = await publicSecRecentIpos(from, to);
      list = secRows.map((row) => ({
        date: row.date,
        ...(row.symbol ? { symbol: row.symbol } : {}),
        name: row.name,
        exchange: "SEC EDGAR",
        status: "filed",
      }));
      if (list.length) source = "sec-edgar";
    }

    // Finnhub sigue disponible como credentialed fallback for expected/priced
    // entries that neither public calendar currently returns.
    if (!list.length && process.env.FINNHUB_API_KEY?.trim()) {
      const token = process.env.FINNHUB_API_KEY.trim();
      const res = await fetch(
        `https://finnhub.io/api/v1/calendar/ipo?from=${from}&to=${to}&token=${token}`,
        { next: { revalidate: 3600 } }
      );
      if (res.ok) {
        const data = await res.json();
        list = (data.ipoCalendar || []).map((row: Record<string, unknown>) => ({
          date: String(row.date || ""),
          symbol: row.symbol ? String(row.symbol) : undefined,
          name: String(row.name || row.symbol || "IPO"),
          exchange: row.exchange ? String(row.exchange) : undefined,
          price: row.price != null ? String(row.price) : undefined,
          status: row.status ? String(row.status) : undefined,
          numberOfShares: typeof row.numberOfShares === "number" ? row.numberOfShares : undefined,
          totalSharesValue: typeof row.totalSharesValue === "number" ? row.totalSharesValue : undefined,
        } as IpoItem));
        if (list.length) source = "finnhub";
      }
    }

    if (status) list = list.filter((item) => (item.status || "").toLowerCase() === status);
    list.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      from,
      to,
      ipos: list,
      count: list.length,
      usingRealData: list.length > 0,
      source: source || "none",
      sourcesAttempted: ["nasdaq-public", "sec-edgar", ...(process.env.FINNHUB_API_KEY?.trim() ? ["finnhub"] : [])],
      note: source === "sec-edgar"
        ? "SEC EDGAR muestra registros S-1; no equivale a un calendario confirmado de IPOs."
        : "Calendario orientativo; los mercados pueden publicar o corregir fechas.",
    });
  } catch (err) {
    console.error("IPO API error:", err);
    return NextResponse.json(
      { ipos: [], count: 0, error: "Error al cargar IPOs", source: "none" },
      { status: 500 }
    );
  }
}

export const GET = withCachePolicy("/api/ipo", get);
