import type { MarketDataProvider, Quote, SearchResult } from "./types";
export class DatabursatilProvider implements MarketDataProvider {
  name = "databursatil";
  constructor(_token?: string) {}
  async getQuote(_symbol: string): Promise<Quote | null> { return null; }
  async getQuotes(_symbols: string[]): Promise<Quote[]> { return []; }
  async search(_query: string): Promise<SearchResult[]> { return []; }
}
