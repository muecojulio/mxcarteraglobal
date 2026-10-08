import { NextRequest, NextResponse } from "next/server";
import { getMarketDataProvider } from "@/lib/market-data";
import { isExcludedInstrument, normalizeYahooSymbol } from "@/lib/market-data/types";

export const dynamic = "force-dynamic";

const UNIVERSE_US = [
  "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "JPM", "V", "UNH",
  "JNJ", "WMT", "PG", "MA", "HD", "XOM", "CVX", "KO", "PEP", "ABBV", "COST",
  "AVGO", "MRK", "LLY", "BAC", "ORCL", "CRM", "AMD", "NFLX", "DIS", "ADBE",
  "CSCO", "INTC", "PFE", "T", "VZ", "NKE", "MCD", "IBM", "GE", "BP", "MO", "O",
  "CAG", "MPW", "KMI", "PBR-A", "VICI", "SWK", "BBD", "ALTY", "PFFD", "SCHD",
  "QYLD", "SRET", "SPYD", "NOBL", "SPHD", "PFF", "HDV", "FDD",
];
const UNIVERSE_MX = [
  "AMXL.MX", "WALMEX.MX", "GFNORTEO.MX", "FEMSAUBD.MX", "BIMBOA.MX",
  "CEMEXCPO.MX", "GMEXICOB.MX", "TLEVISACPO.MX", "ALSEA.MX", "KIMBERA.MX", "KOFUBL.MX",
];
const UNIVERSE_GLOBAL = ["IBE.MC"];

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

function numberParam(params: URLSearchParams, key: string): number {
  const raw = params.get(key);
  if (raw == null || raw.trim() === "") return Number.NaN;
  const value = Number(raw);
  return Number.isFinite(value) ? value : Number.NaN;
}

function quoteRows(quotes: Awaited<ReturnType<ReturnType<typeof getMarketDataProvider>["getQuotes"]>>): ScreenerRow[] {
  return quotes
    .filter((quote) => !isExcludedInstrument(quote.symbol))
    .map((quote) => ({
      symbol: normalizeYahooSymbol(quote.symbol),
      name: quote.name,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      volume: quote.volume,
      region: quote.region,
      currency: quote.currency,
      source: quote.source,
    }));
}

async function fmpMovers(preset: string, key: string): Promise<ScreenerRow[]> {
  const path = preset === "gainers" ? "biggest-gainers" : preset === "losers" ? "biggest-losers" : "most-actives";
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/stable/${path}?apikey=${key}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const list = await res.json();
    if (!Array.isArray(list)) return [];
    return list.slice(0, 40).flatMap((row: Record<string, unknown>) => {
      const symbol = normalizeYahooSymbol(String(row.symbol || ""));
      if (!symbol || isExcludedInstrument(symbol)) return [];
      return [{
        symbol,
        name: String(row.name || symbol),
        price: Number(row.price || 0),
        change: Number(row.change || 0),
        changePercent: Number(row.changesPercentage ?? row.changePercentage ?? 0),
        volume: row.volume != null ? Number(row.volume) : undefined,
        region: "US",
        currency: "USD",
        source: "fmp",
      }];
    });
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const preset = params.get("preset") || "universe";
  // gainers | losers | actives | universe
  const region = (params.get("region") || "ALL").toUpperCase();
  const minChange = numberParam(params, "minChange");
  const maxChange = numberParam(params, "maxChange");
  const minPrice = numberParam(params, "minPrice");
  const maxPrice = numberParam(params, "maxPrice");

  let rows: ScreenerRow[] = [];
  let source = "none";

  try {
    const provider = getMarketDataProvider();
    const symbols = region === "MX"
      ? UNIVERSE_MX
      : region === "US"
        ? UNIVERSE_US
        : region === "GLOBAL"
          ? UNIVERSE_GLOBAL
          : [...UNIVERSE_US, ...UNIVERSE_MX, ...UNIVERSE_GLOBAL];

    // Los presets se calculan con las cotizaciones públicas disponibles; si
    // ningún proveedor sin key devuelve datos, se cae al FMP ya configurado.
    rows = quoteRows(await provider.getQuotes(symbols));
    if (rows.length) {
      source = [...new Set(rows.map((row) => row.source || "unknown"))].join("+");
    }

    if (!rows.length && process.env.FMP_API_KEY?.trim() && ["gainers", "losers", "actives"].includes(preset)) {
      rows = await fmpMovers(preset, process.env.FMP_API_KEY.trim());
      if (rows.length) source = "fmp-fallback";
    }

    rows = rows.filter((row) => {
      if (!Number.isNaN(minChange) && row.changePercent < minChange) return false;
      if (!Number.isNaN(maxChange) && row.changePercent > maxChange) return false;
      if (!Number.isNaN(minPrice) && row.price < minPrice) return false;
      if (!Number.isNaN(maxPrice) && row.price > maxPrice) return false;
      if (region === "US" && row.region !== "US") return false;
      if (region === "MX" && row.region !== "MX") return false;
      if (region === "GLOBAL" && row.region !== "GLOBAL") return false;
      return true;
    });

    if (preset === "gainers") rows.sort((a, b) => b.changePercent - a.changePercent);
    else if (preset === "losers") rows.sort((a, b) => a.changePercent - b.changePercent);
    else if (preset === "actives") rows.sort((a, b) => (b.volume || 0) - (a.volume || 0));
    else rows.sort((a, b) => b.changePercent - a.changePercent);

    return NextResponse.json(
      { preset, region, results: rows, count: rows.length, source, excluded: ["forex", "cryptocurrencies"] },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (err) {
    console.error("Screener error:", err);
    return NextResponse.json(
      { results: [], count: 0, error: "Error en screener", source: "none" },
      { status: 500 }
    );
  }
}
