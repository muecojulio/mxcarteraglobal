import type {
  MarketDataProvider,
  Quote,
  SearchResult,
  IndexQuote,
} from "./types";
import { detectRegion, detectCurrency } from "./types";

const BASE = "https://api.twelvedata.com";

/**
 * Twelve Data — Europa, Asia y mercados globales (plan free ~800 calls/día)
 * Símbolos: SAP, VOD, 7203 + exchange opcional (XETR, LSE, TSE)
 * También acepta formato SYMBOL:EXCHANGE
 *
 * Registro gratis: https://twelvedata.com
 */
export class TwelveDataProvider implements MarketDataProvider {
  name = "twelvedata";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetchJson<T>(
    path: string,
    params: Record<string, string> = {}
  ): Promise<T | null> {
    const url = new URL(`${BASE}${path}`);
    url.searchParams.set("apikey", this.apiKey);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    try {
      const res = await fetch(url.toString(), { next: { revalidate: 60 } });
      const data = await res.json();
      if (data?.code && data.code !== 200) {
        console.error("TwelveData error:", data.code, data.message);
        return null;
      }
      if (data?.status === "error") {
        console.error("TwelveData error:", data.message);
        return null;
      }
      return data as T;
    } catch (err) {
      console.error("TwelveData fetch failed:", err);
      return null;
    }
  }

  /** Parse "SAP.DE" / "SAP:XETR" / "7203.T" → { symbol, exchange? } */
  private parseSymbol(raw: string): { symbol: string; exchange?: string } {
    const s = raw.toUpperCase().trim();

    // SYMBOL:EXCHANGE
    if (s.includes(":")) {
      const [sym, ex] = s.split(":");
      return { symbol: sym, exchange: ex };
    }

    // Common Yahoo-style suffixes → Twelve Data exchange
    const suffixMap: Record<string, string> = {
      ".L": "LSE",
      ".LON": "LSE",
      ".PA": "EURONEXT",
      ".DE": "XETR",
      ".F": "XETR",
      ".T": "TSE",
      ".TYO": "TSE",
      ".HK": "HKEX",
      ".SS": "SSE",
      ".SZ": "SZSE",
      ".AX": "ASX",
      ".TO": "TSX",
      ".SW": "SIX",
      ".MI": "MIL",
      ".MC": "BME",
      ".AS": "EURONEXT",
      ".BR": "EURONEXT",
    };

    for (const [suffix, exchange] of Object.entries(suffixMap)) {
      if (s.endsWith(suffix)) {
        return { symbol: s.slice(0, -suffix.length), exchange };
      }
    }

    return { symbol: s };
  }

  private regionFromExchange(exchange?: string, symbol?: string): "US" | "MX" | "GLOBAL" {
    if (!exchange && symbol) return detectRegion(symbol);
    const ex = (exchange || "").toUpperCase();
    if (["NASDAQ", "NYSE", "AMEX", "BATS"].some((e) => ex.includes(e))) return "US";
    if (ex.includes("BMV") || ex.includes("MEX")) return "MX";
    return "GLOBAL";
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    const { symbol: sym, exchange } = this.parseSymbol(symbol);
    const params: Record<string, string> = { symbol: sym };
    if (exchange) params.exchange = exchange;

    const data = await this.fetchJson<{
      symbol?: string;
      name?: string;
      exchange?: string;
      currency?: string;
      close?: string;
      previous_close?: string;
      change?: string;
      percent_change?: string;
      volume?: string;
      datetime?: string;
      timestamp?: number;
    }>("/quote", params);

    if (!data?.close && !data?.symbol) return null;

    const price = parseFloat(data.close || "0");
    if (!price) return null;

    const prev = parseFloat(data.previous_close || String(price));
    const change = parseFloat(data.change || String(price - prev));
    const changePercent = parseFloat(data.percent_change || "0");
    const region = this.regionFromExchange(data.exchange || exchange, symbol);

    return {
      symbol: data.symbol || sym,
      name: data.name || sym,
      price,
      change,
      changePercent,
      previousClose: prev,
      volume: data.volume ? parseFloat(data.volume) : undefined,
      currency: data.currency || detectCurrency(symbol, region),
      region,
      market: data.exchange || exchange,
      exchange: data.exchange || exchange,
      updatedAt: data.timestamp
        ? new Date(data.timestamp * 1000).toISOString()
        : new Date().toISOString(),
      source: "twelvedata",
    };
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    // Free tier: sequential with care (8/min). Batch limited.
    const unique = [...new Set(symbols)].slice(0, 15);
    const results: Quote[] = [];
    for (const s of unique) {
      const q = await this.getQuote(s);
      if (q) results.push(q);
    }
    return results;
  }

  async search(query: string): Promise<SearchResult[]> {
    const data = await this.fetchJson<{
      data?: Array<{
        symbol: string;
        instrument_name: string;
        exchange: string;
        country?: string;
        currency?: string;
      }>;
    }>("/symbol_search", { symbol: query });

    if (!data?.data?.length) return [];

    return data.data.slice(0, 15).map((r) => {
      const region = this.regionFromExchange(r.exchange);
      return {
        symbol: r.symbol,
        name: r.instrument_name,
        exchange: r.exchange,
        region,
        currency: r.currency || detectCurrency(r.symbol, region),
      };
    });
  }

  async getIndices(): Promise<IndexQuote[]> {
    // Popular global indices via quote
    const list = [
      { symbol: "IXIC", name: "Nasdaq Composite", region: "US" as const },
      { symbol: "SPX", name: "S&P 500", region: "US" as const },
    ];
    const out: IndexQuote[] = [];
    for (const item of list) {
      const q = await this.getQuote(item.symbol);
      if (q) {
        out.push({
          symbol: item.symbol,
          name: item.name,
          price: q.price,
          changePercent: q.changePercent,
          region: item.region,
          updatedAt: q.updatedAt,
          source: "twelvedata",
        });
      }
    }
    return out;
  }
}
