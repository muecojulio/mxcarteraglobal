import { NextRequest, NextResponse } from "next/server";
import { getMarketDataProvider } from "@/lib/market-data";

export const dynamic = "force-dynamic";

const UNIVERSE_US = [
  "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "JPM", "V", "UNH",
  "JNJ", "WMT", "PG", "MA", "HD", "XOM", "CVX", "KO", "PEP", "ABBV",
  "COST", "AVGO", "MRK", "LLY", "BAC", "ORCL", "CRM", "AMD", "NFLX", "DIS",
  "ADBE", "CSCO", "INTC", "PFE", "T", "VZ", "NKE", "MCD", "IBM", "GE",
];

const UNIVERSE_MX = [
  "AMXL.MX", "WALMEX.MX", "GFNORTEO.MX", "FEMSAUBD.MX", "BIMBOA.MX",
  "CEMEXCPO.MX", "GMEXICOB.MX", "TLEVISACPO.MX", "ALSEA.MX", "KIMBERA.MX",
];

type ScreenerRow = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  region: string;
  currency: string;
  source?: string;
};

export async function GET(req: NextRequest) {
  const preset = req.nextUrl.searchParams.get("preset") || "universe";
  // gainers | losers | actives | universe
  const region = (req.nextUrl.searchParams.get("region") || "ALL").toUpperCase();
  const minChange = parseFloat(req.nextUrl.searchParams.get("minChange") || "");
  const maxChange = parseFloat(req.nextUrl.searchParams.get("maxChange") || "");
  const minPrice = parseFloat(req.nextUrl.searchParams.get("minPrice") || "");
  const maxPrice = parseFloat(req.nextUrl.searchParams.get("maxPrice") || "");

  const fmp = process.env.FMP_API_KEY?.trim();
  let rows: ScreenerRow[] = [];
  let source = "composite";

  try {
    if (
      fmp &&
      (preset === "gainers" || preset === "losers" || preset === "actives")
    ) {
      const path =
        preset === "gainers"
          ? "biggest-gainers"
          : preset === "losers"
          ? "biggest-losers"
          : "most-actives";
      const res = await fetch(
        `https://financialmodelingprep.com/stable/${path}?apikey=${fmp}`,
        { next: { revalidate: 300 } }
      );
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          rows = list.slice(0, 40).map((r: Record<string, unknown>) => ({
            symbol: String(r.symbol || ""),
            name: String(r.name || r.symbol || ""),
            price: Number(r.price || 0),
            change: Number(r.change || 0),
            changePercent: Number(
              r.changesPercentage ?? r.changePercentage ?? 0
            ),
            volume: r.volume != null ? Number(r.volume) : undefined,
            region: "US",
            currency: "USD",
            source: "fmp",
          }));
          source = "fmp";
        }
      }
    }

    if (rows.length === 0 || preset === "universe") {
      const provider = getMarketDataProvider();
      let symbols: string[] = [];
      if (region === "MX") symbols = UNIVERSE_MX;
      else if (region === "US") symbols = UNIVERSE_US;
      else symbols = [...UNIVERSE_US, ...UNIVERSE_MX];

      const quotes = await provider.getQuotes(symbols);
      rows = quotes.map((q) => ({
        symbol: q.symbol,
        name: q.name,
        price: q.price,
        change: q.change,
        changePercent: q.changePercent,
        volume: q.volume,
        region: q.region,
        currency: q.currency,
        source: q.source,
      }));
      source = "composite";
    }

    // Filtros numéricos
    rows = rows.filter((r) => {
      if (!Number.isNaN(minChange) && r.changePercent < minChange) return false;
      if (!Number.isNaN(maxChange) && r.changePercent > maxChange) return false;
      if (!Number.isNaN(minPrice) && r.price < minPrice) return false;
      if (!Number.isNaN(maxPrice) && r.price > maxPrice) return false;
      if (region === "US" && r.region !== "US") return false;
      if (region === "MX" && r.region !== "MX") return false;
      return true;
    });

    // Orden por preset
    if (preset === "gainers") {
      rows.sort((a, b) => b.changePercent - a.changePercent);
    } else if (preset === "losers") {
      rows.sort((a, b) => a.changePercent - b.changePercent);
    } else if (preset === "actives") {
      rows.sort((a, b) => (b.volume || 0) - (a.volume || 0));
    } else {
      rows.sort((a, b) => b.changePercent - a.changePercent);
    }

    return NextResponse.json({
      preset,
      region,
      results: rows,
      count: rows.length,
      source,
    });
  } catch (err) {
    console.error("Screener error:", err);
    return NextResponse.json(
      { results: [], count: 0, error: "Error en screener" },
      { status: 500 }
    );
  }
}
