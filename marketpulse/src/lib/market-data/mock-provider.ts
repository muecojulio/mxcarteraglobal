import type { MarketDataProvider, Quote, SearchResult, IndexQuote } from "./types";
import { detectRegion, detectCurrency } from "./types";
import { mockStocks, mockIndices } from "../mock-data";

export class MockProvider implements MarketDataProvider {
  name = "mock";

  async getQuote(symbol: string): Promise<Quote | null> {
    const found = mockStocks.find((s) => s.symbol.toUpperCase() === symbol.toUpperCase());
    if (!found) {
      const region = detectRegion(symbol);
      const base = 50 + Math.random() * 200;
      const changePercent = (Math.random() - 0.5) * 4;
      const change = (base * changePercent) / 100;
      return {
        symbol: symbol.toUpperCase(),
        name: symbol.toUpperCase(),
        price: Number(base.toFixed(2)),
        change: Number(change.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
        currency: detectCurrency(symbol, region),
        region,
        updatedAt: new Date().toISOString(),
        source: "mock",
      };
    }
    return {
      symbol: found.symbol,
      name: found.name,
      price: found.price,
      change: found.change,
      changePercent: found.changePercent,
      currency: found.currency,
      region: found.region,
      market: found.market,
      updatedAt: new Date().toISOString(),
      source: "mock",
    };
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const results: Quote[] = [];
    for (const symbol of symbols) {
      const q = await this.getQuote(symbol);
      if (q) results.push(q);
    }
    return results;
  }

  async search(query: string): Promise<SearchResult[]> {
    const q = query.toLowerCase();
    return mockStocks
      .filter((s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .map((s) => ({ symbol: s.symbol, name: s.name, exchange: s.market, region: s.region, currency: s.currency }));
  }

  async getIndices(): Promise<IndexQuote[]> {
    return mockIndices.map((i) => ({
      symbol: i.symbol,
      name: i.name,
      price: i.price,
      changePercent: i.changePercent,
      region: i.region,
      updatedAt: new Date().toISOString(),
      source: "mock",
    }));
  }
}
