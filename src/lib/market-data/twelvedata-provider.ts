import type { MarketDataProvider, Quote, SearchResult, IndexQuote } from "./types";
import { detectRegion, detectCurrency } from "./types";
const BASE = "https://api.twelvedata.com";
export class TwelveDataProvider implements MarketDataProvider {
  name = "twelvedata";
  private apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }
  private async fetchJson<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
    const url = new URL(`${BASE}${path}`);
    url.searchParams.set("apikey", this.apiKey);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    try {
      const res = await fetch(url.toString(), { next: { revalidate: 60 } });
      const data = await res.json();
      if (data?.code && data.code !== 200) return null;
      return data as T;
    } catch { return null; }
  }
  async getQuote(symbol: string): Promise<Quote | null> {
    const sym = symbol.toUpperCase();
    const data = await this.fetchJson<{ symbol?: string; name?: string; close?: string; previous_close?: string; change?: string; percent_change?: string; currency?: string; exchange?: string }>("/quote", { symbol: sym });
    const price = Number(data?.close);
    if (!data || !Number.isFinite(price) || price <= 0) return null;
    const prev = Number(data.previous_close ?? price);
    const change = Number(data.change ?? price - prev);
    const changePercent = Number(data.percent_change ?? (prev ? (change / prev) * 100 : 0));
    const region = detectRegion(sym);
    return { symbol: data.symbol || sym, name: data.name || sym, price, change, changePercent, previousClose: prev, currency: data.currency || detectCurrency(sym, region), region, market: data.exchange, exchange: data.exchange, updatedAt: new Date().toISOString(), source: "twelvedata" };
  }
  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const out: Quote[] = [];
    for (const s of [...new Set(symbols.map((x) => x.toUpperCase()))].slice(0, 8)) {
      const q = await this.getQuote(s);
      if (q) out.push(q);
    }
    return out;
  }
  async search(query: string): Promise<SearchResult[]> {
    const data = await this.fetchJson<{ data?: Array<{ symbol?: string; instrument_name?: string; exchange?: string; currency?: string }> }>("/symbol_search", { symbol: query });
    return (data?.data || []).slice(0, 12).map((r) => {
      const symbol = r.symbol || "";
      const region = detectRegion(symbol);
      return { symbol, name: r.instrument_name || symbol, exchange: r.exchange, region, currency: r.currency || detectCurrency(symbol, region) };
    });
  }
  async getIndices(): Promise<IndexQuote[]> { return []; }
}
