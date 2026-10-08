import type {
  DividendRecord,
  IndexQuote,
  MarketDataProvider,
  Quote,
  SearchResult,
} from "./types";
import {
  detectRegion,
  isExcludedInstrument,
  normalizeYahooSymbol,
} from "./types";
import { FinnhubProvider } from "./finnhub-provider";
import { DataBursatilProvider } from "./databursatil-provider";
import { FmpProvider } from "./fmp-provider";
import { TwelveDataProvider } from "./twelvedata-provider";
import { YahooProvider } from "./yahoo-provider";
import { PolygonProvider } from "./polygon-provider";
import { FinageProvider } from "./finage-provider";
import {
  freeNasdaqQuote,
  freeTradingViewQuote,
  freeYahooDividends,
  freeYahooSearch,
} from "../free-finance";

export { detectRegion, detectAssetType, detectCurrency, isExcludedInstrument, normalizeYahooSymbol } from "./types";
export * from "./types";
export { MockProvider } from "./mock-provider";
export { FinnhubProvider } from "./finnhub-provider";
export { DataBursatilProvider } from "./databursatil-provider";
export { FmpProvider } from "./fmp-provider";
export { TwelveDataProvider } from "./twelvedata-provider";
export { YahooProvider } from "./yahoo-provider";

async function fetchFinnhubDividends(
  symbol: string,
  token: string
): Promise<DividendRecord[]> {
  try {
    const to = new Date().toISOString().slice(0, 10);
    const fromDate = new Date();
    fromDate.setFullYear(fromDate.getFullYear() - 10);
    const from = fromDate.toISOString().slice(0, 10);
    const url = `https://finnhub.io/api/v1/stock/dividend2?symbol=${encodeURIComponent(
      symbol
    )}&from=${from}&to=${to}&token=${token}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    const list = data?.data || data || [];
    if (!Array.isArray(list)) return [];
    return list
      .map((row: { amount?: number; date?: string; payDate?: string }) => ({
        date: String(row.date || row.payDate || "").slice(0, 10),
        amount: Number(row.amount) || 0,
        currency: "USD",
      }))
      .filter((row: DividendRecord) => row.date && Number(row.amount) > 0)
      .sort((a: DividendRecord, b: DividendRecord) => String(b.date).localeCompare(String(a.date)));
  } catch {
    return [];
  }
}

async function mapLimit<T, R>(
  input: T[],
  limit: number,
  callback: (value: T) => Promise<R>
): Promise<R[]> {
  const output = new Array<R>(input.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, input.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= input.length) return;
      output[index] = await callback(input[index]);
    }
  });
  await Promise.all(workers);
  return output;
}

/**
 * Prioridad de cotización:
 * 1. Fuentes públicas sin clave: Yahoo → Nasdaq → TradingView Scanner.
 * 2. Si las públicas no responden, se prueban los proveedores con variables
 *    de entorno configuradas (DataBursatil, Finnhub, Polygon/Massive,
 *    Finage y Twelve Data).
 *
 * Las fuentes públicas no tienen SLA y pueden aplicar límites. Nunca se fabrica
 * un precio: si ningún proveedor confirma una cotización, se devuelve null.
 */
class CompositeProvider implements MarketDataProvider {
  name = "public-first";
  private mx: DataBursatilProvider | null;
  private us: FinnhubProvider | null;
  private twelve: TwelveDataProvider | null;
  private yahoo = new YahooProvider();
  private polygon: PolygonProvider | null;
  private finage: FinageProvider | null;
  private fmp: FmpProvider | null;

  constructor(opts: {
    dbToken?: string;
    finnhubKey?: string;
    fmpKey?: string;
    twelveKey?: string;
    polygonKey?: string;
    finageKey?: string;
  }) {
    this.mx = opts.dbToken ? new DataBursatilProvider(opts.dbToken) : null;
    this.us = opts.finnhubKey ? new FinnhubProvider(opts.finnhubKey) : null;
    this.twelve = opts.twelveKey ? new TwelveDataProvider(opts.twelveKey) : null;
    this.polygon = opts.polygonKey ? new PolygonProvider(opts.polygonKey) : null;
    this.finage = opts.finageKey ? new FinageProvider(opts.finageKey) : null;
    this.fmp = opts.fmpKey ? new FmpProvider(opts.fmpKey) : null;
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    const sym = normalizeYahooSymbol(symbol);
    if (!sym || isExcludedInstrument(sym)) return null;
    const region = detectRegion(sym);

    // APIs públicas sin clave primero; proveedores con llave son el último respaldo.
    const yahoo = await this.yahoo.getQuote(sym);
    if (yahoo) return yahoo;

    if (region === "US") {
      const nasdaq = await freeNasdaqQuote(sym);
      if (nasdaq) return nasdaq;
    }

    const tradingView = await freeTradingViewQuote(sym);
    if (tradingView) return tradingView;

    // Respaldo con credenciales ya disponibles, solo después de agotar lo público.
    if (region === "MX" && this.mx) {
      const quote = await this.mx.getQuote(sym);
      if (quote) return quote;
    }
    if (region === "US" && this.us) {
      const quote = await this.us.getQuote(sym);
      if (quote?.source === "finnhub") return quote;
    }
    if (region === "US" && this.polygon) {
      const quote = await this.polygon.getQuote(sym);
      if (quote) return quote;
    }
    if (region === "US" && this.finage) {
      const quote = await this.finage.getQuote(sym);
      if (quote) return quote;
    }
    if (this.twelve) {
      const quote = await this.twelve.getQuote(sym);
      if (quote) return quote;
    }
    return null;
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const unique = [...new Set(symbols.map(normalizeYahooSymbol))]
      .filter((symbol) => symbol && !isExcludedInstrument(symbol));
    const quotes = await mapLimit(unique, 8, (symbol) => this.getQuote(symbol));
    return quotes.filter((quote): quote is Quote => quote !== null);
  }

  async search(query: string): Promise<SearchResult[]> {
    const [publicResults, mxResults, usResults] = await Promise.all([
      freeYahooSearch(query),
      this.mx ? this.mx.search(query) : Promise.resolve([]),
      this.us ? this.us.search(query) : Promise.resolve([]),
    ]);
    const seen = new Set<string>();
    return [...publicResults, ...mxResults, ...usResults]
      .filter((result) => {
        const symbol = normalizeYahooSymbol(result.symbol);
        if (!symbol || isExcludedInstrument(symbol, result.type)) return false;
        const key = symbol.toUpperCase();
        if (seen.has(key)) return false;
        seen.add(key);
        result.symbol = symbol;
        return true;
      })
      .slice(0, 30);
  }

  async getIndices(): Promise<IndexQuote[]> {
    const indices = await this.yahoo.getIndices();
    if (indices.length) return indices;
    if (this.us) {
      const finnhubIndices = await this.us.getIndices();
      if (finnhubIndices.length) return finnhubIndices;
    }
    if (this.twelve) {
      const twelveIndices = await this.twelve.getIndices?.();
      if (twelveIndices?.length) return twelveIndices;
    }
    return [];
  }

  async getDividends(symbol: string): Promise<DividendRecord[]> {
    const sym = normalizeYahooSymbol(symbol);
    if (!sym || isExcludedInstrument(sym)) return [];
    const region = detectRegion(sym);

    // Yahoo ofrece dividendos históricos gratuitos y sin API key.
    const yahoo = await freeYahooDividends(sym);
    if (yahoo.length) return yahoo;

    // Proveedores con variables de entorno como respaldo.
    if (region === "MX" && this.mx) {
      try {
        const dividends = await this.mx.getDividends(sym);
        if (dividends.length) {
          return dividends.map((dividend) => ({
            date: dividend.date,
            amount: dividend.amount,
            currency: dividend.currency || "MXN",
            exDate: dividend.exDate,
            type: dividend.type,
          }));
        }
      } catch {
        // Continúa con los siguientes respaldos.
      }
    }
    if (this.fmp) {
      try {
        const dividends = await this.fmp.getDividends(sym);
        if (dividends.length) return dividends;
      } catch {
        // Continúa con Finnhub.
      }
    }
    const finnhubKey = process.env.FINNHUB_API_KEY?.trim();
    if (finnhubKey && region === "US") {
      const dividends = await fetchFinnhubDividends(sym, finnhubKey);
      if (dividends.length) return dividends;
    }
    return [];
  }
}

let provider: CompositeProvider | null = null;

export function getMarketDataProvider(): MarketDataProvider {
  if (!provider) {
    provider = new CompositeProvider({
      dbToken: process.env.DATABURSATIL_TOKEN?.trim(),
      finnhubKey: process.env.FINNHUB_API_KEY?.trim(),
      fmpKey: process.env.FMP_API_KEY?.trim(),
      twelveKey: process.env.TWELVEDATA_API_KEY?.trim(),
      polygonKey:
        process.env.POLYGON_API_KEY?.trim() || process.env.MASSIVE_API_KEY?.trim(),
      finageKey: process.env.FINAGE_API_KEY?.trim(),
    });
  }
  return provider;
}

export function getCompositeProvider(): CompositeProvider {
  return getMarketDataProvider() as CompositeProvider;
}

export function isUsingRealData(): boolean {
  // Yahoo/Nasdaq/TradingView are attempted without requiring credentials.
  return true;
}

export function getDataSources(): string[] {
  const sources = ["yahoo-public", "nasdaq-public", "tradingview-public", "sec-edgar", "fred-public", "treasury-public"];
  if (process.env.DATABURSATIL_TOKEN?.trim()) sources.push("databursatil");
  if (process.env.FINNHUB_API_KEY?.trim()) sources.push("finnhub");
  if (process.env.FMP_API_KEY?.trim()) sources.push("fmp");
  if (process.env.ALPHA_VANTAGE_API_KEY?.trim()) sources.push("alpha-vantage");
  if (process.env.TWELVEDATA_API_KEY?.trim()) sources.push("twelvedata");
  if (process.env.POLYGON_API_KEY?.trim() || process.env.MASSIVE_API_KEY?.trim()) sources.push("polygon");
  if (process.env.FINAGE_API_KEY?.trim()) sources.push("finage");
  return sources;
}
