import { NextRequest, NextResponse } from "next/server";

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

export async function GET(req: NextRequest) {
  const finnhub = process.env.FINNHUB_API_KEY?.trim();
  if (!finnhub) {
    return NextResponse.json({
      ipos: [],
      count: 0,
      usingRealData: false,
      error: "FINNHUB_API_KEY no configurada",
    });
  }

  const from =
    req.nextUrl.searchParams.get("from") ||
    new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const to =
    req.nextUrl.searchParams.get("to") ||
    new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  const status = req.nextUrl.searchParams.get("status"); // expected | filed | priced | withdrawn

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/calendar/ipo?from=${from}&to=${to}&token=${finnhub}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) {
      return NextResponse.json(
        { ipos: [], count: 0, error: `Finnhub HTTP ${res.status}` },
        { status: 502 }
      );
    }
    const data = await res.json();
    let list: IpoItem[] = (data.ipoCalendar || []).map(
      (r: Record<string, unknown>) => ({
        date: String(r.date || ""),
        symbol: r.symbol ? String(r.symbol) : undefined,
        name: String(r.name || r.symbol || "IPO"),
        exchange: r.exchange ? String(r.exchange) : undefined,
        price: r.price != null ? String(r.price) : undefined,
        status: r.status ? String(r.status) : undefined,
        numberOfShares:
          typeof r.numberOfShares === "number" ? r.numberOfShares : undefined,
        totalSharesValue:
          typeof r.totalSharesValue === "number"
            ? r.totalSharesValue
            : undefined,
      })
    );

    if (status) {
      list = list.filter(
        (i) => (i.status || "").toLowerCase() === status.toLowerCase()
      );
    }

    list.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      from,
      to,
      ipos: list,
      count: list.length,
      usingRealData: true,
      source: "finnhub",
    });
  } catch (err) {
    console.error("IPO API error:", err);
    return NextResponse.json(
      { ipos: [], count: 0, error: "Error al cargar IPOs" },
      { status: 500 }
    );
  }
}
