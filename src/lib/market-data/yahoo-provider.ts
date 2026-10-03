import type { MarketDataProvider, Quote, SearchResult, IndexQuote } from "./types";
import { detectRegion, detectCurrency, normalizeYahooSymbol } from "./types";

export class YahooProvider implements MarketDataProvider {
  name = "yahoo";

  private async fetchChart(symbol: string) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MX Cartera Global/1.0)" },
        next: { revalidate: 60 },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.chart?.result?.[0] ?? null;
    } catch {
      return null;
    }
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    const sym = normalizeYahooSymbol(symbol);
    const result = await this.fetchChart(sym);
    if (!result?.meta) return null;
    const meta = result.meta as {
      symbol?: string; regularMarketPrice?: number; previousClose?: number;
      chartPreviousClose?: number; regularMarketVolume?: number; currency?: string;
      exchangeName?: string; shortName?: string; longName?: string; regularMarketTime?: number;
    };
    const price = meta.regularMarketPrice;
    if (price == null || price === 0) return null;
    const prev = meta.previousClose ?? meta.chartPreviousClose ?? price;
    const change = price - prev;
    const changePercent = prev ? (change / prev) * 100 : 0;
    const region = detectRegion(sym);
    let currency = meta.currency || detectCurrency(sym, region);
    if (currency === "GBp") currency = "GBP";
    return {
      symbol: meta.symbol || sym,
      name: meta.longName || meta.shortName || sym,
      price, change, changePercent, previousClose: prev,
      volume: meta.regularMarketVolume, currency, region,
      market: meta.exchangeName, exchange: meta.exchangeName,
      updatedAt: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : new Date().toISOString(),
      source: "yahoo",
    };
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const unique = [...new Set(symbols.map((s) => normalizeYahooSymbol(s)))].slice(0, 20);
    const results = await Promise.all(unique.map((s) => this.getQuote(s)));
    return results.filter((q): q is Quote => q !== null);
  }

  async search(query: string): Promise<SearchResult[]> {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=12&newsCount=0`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MX Cartera Global/1.0)" },
        next: { revalidate: 300 },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data?.quotes || [])
        .filter((q: { symbol?: string; quoteType?: string }) => q.symbol && ["EQUITY", "ETF", "INDEX", "MUTUALFUND"].includes(String(q.quoteType || "").toUpperCase()))
        .map((q: { symbol: string; shortname?: string; longname?: string; exchange?: string; quoteType?: string }) => {
          const region = detectRegion(q.symbol);
          return { symbol: q.symbol, name: q.longname || q.shortname || q.symbol, exchange: q.exchange, type: q.quoteType, region, currency: detectCurrency(q.symbol, region) };
        });
    } catch {
      return [];
    }
  }

  async getIndices(): Promise<IndexQuote[]> {
    const list = [
      { symbol: "^GSPC", name: "S&P 500", region: "US" as const },
      { symbol: "^DJI", name: "Dow Jones", region: "US" as const },
      { symbol: "^IXIC", name: "Nasdaq", region: "US" as const },
      { symbol: "^MXX", name: "IPC México", region: "MX" as const },
      { symbol: "^FTSE", name: "FTSE 100", region: "GLOBAL" as const },
      { symbol: "^GDAXI", name: "DAX", region: "GLOBAL" as const },
      { symbol: "^N225", name: "Nikkei 225", region: "GLOBAL" as const },
    ];
    const out: IndexQuote[] = [];
    await Promise.all(list.map(async (item) => {
      const q = await this.getQuote(item.symbol);
      if (q) out.push({ symbol: item.symbol, name: item.name, price: q.price, changePercent: q.changePercent, region: item.region, updatedAt: q.updatedAt, source: "yahoo" });
    }));
    return out;
  }
}
