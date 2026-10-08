import type {
  MarketDataProvider,
  Quote,
  SearchResult,
  IndexQuote,
} from "./types";
import {
  detectRegion,
  detectCurrency,
  isExcludedInstrument,
  normalizeYahooSymbol,
} from "./types";

/**
 * Yahoo Finance (endpoints públicos, sin API key).
 * Excelente cobertura Europa / Asia / global.
 * No oficial: puede cambiar o limitar; ideal para free tier internacional.
 *
 * Símbolos: SAP.DE, VOD.L, 7203.T, 0700.HK, etc.
 */
export class YahooProvider implements MarketDataProvider {
  name = "yahoo";

  private async fetchChart(symbol: string): Promise<{
    meta: Record<string, unknown>;
    indicators?: { quote?: Array<Record<string, (number | null)[]>> };
  } | null> {
    const canonical = normalizeYahooSymbol(symbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      canonical
    )}?interval=1d&range=5d`;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; MX Cartera Global/1.0; +https://localhost)",
        },
        next: { revalidate: 60 },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const result = data?.chart?.result?.[0];
      if (!result?.meta) return null;
      return result;
    } catch (err) {
      console.error("Yahoo fetch failed:", err);
      return null;
    }
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    const sym = normalizeYahooSymbol(symbol);
    if (isExcludedInstrument(sym)) return null;
    const result = await this.fetchChart(sym);
    if (!result) return null;

    const meta = result.meta as {
      symbol?: string;
      regularMarketPrice?: number;
      previousClose?: number;
      chartPreviousClose?: number;
      regularMarketVolume?: number;
      currency?: string;
      exchangeName?: string;
      shortName?: string;
      longName?: string;
      regularMarketTime?: number;
    };

    const price = meta.regularMarketPrice;
    if (price == null || price === 0) return null;

    const prev =
      meta.previousClose ?? meta.chartPreviousClose ?? price;
    const change = price - prev;
    const changePercent = prev ? (change / prev) * 100 : 0;
    const region = detectRegion(sym);

    // Yahoo uses GBp (pence) for UK - show as-is; user sees currency code
    let currency = meta.currency || detectCurrency(sym, region);
    if (currency === "GBp") currency = "GBP"; // note: price is in pence often

    return {
      symbol: meta.symbol || sym,
      name: meta.longName || meta.shortName || sym,
      price,
      change,
      changePercent,
      previousClose: prev,
      volume: meta.regularMarketVolume,
      currency,
      region,
      market: meta.exchangeName,
      exchange: meta.exchangeName,
      updatedAt: meta.regularMarketTime
        ? new Date(meta.regularMarketTime * 1000).toISOString()
        : new Date().toISOString(),
      source: "yahoo",
    };
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const unique = [...new Set(symbols.map(normalizeYahooSymbol))]
      .filter((symbol) => !isExcludedInstrument(symbol))
      .slice(0, 40);
    const results = await Promise.all(unique.map((symbol) => this.getQuote(symbol)));
    return results.filter((quote): quote is Quote => quote !== null);
  }

  async search(query: string): Promise<SearchResult[]> {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
      query
    )}&quotesCount=12&newsCount=0`;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; MX Cartera Global/1.0; +https://localhost)",
        },
        next: { revalidate: 300 },
      });
      if (!res.ok) return [];
      const data = await res.json();
      const quotes = Array.isArray(data?.quotes) ? data.quotes : [];
      return quotes
        .filter((quote: { symbol?: string; quoteType?: string }) =>
          Boolean(quote.symbol) && !isExcludedInstrument(String(quote.symbol), quote.quoteType)
        )
        .map(
          (quote: {
            symbol: string;
            shortname?: string;
            longname?: string;
            exchange?: string;
            quoteType?: string;
          }) => {
            const symbol = normalizeYahooSymbol(quote.symbol);
            const region = detectRegion(symbol);
            return {
              symbol,
              name: quote.longname || quote.shortname || symbol,
              exchange: quote.exchange,
              type: quote.quoteType,
              region,
              currency: detectCurrency(symbol, region),
            };
          }
        );
    } catch {
      return [];
    }
  }

  async getIndices(): Promise<IndexQuote[]> {
    const list = [
      // EE.UU.
      { symbol: "^GSPC", name: "S&P 500", region: "US" as const, zone: "US" },
      { symbol: "^DJI", name: "Dow Jones", region: "US" as const, zone: "US" },
      { symbol: "^IXIC", name: "Nasdaq", region: "US" as const, zone: "US" },
      { symbol: "^RUT", name: "Russell 2000", region: "US" as const, zone: "US" },
      // México
      { symbol: "^MXX", name: "IPC México", region: "MX" as const, zone: "MX" },
      // Europa
      { symbol: "^FTSE", name: "FTSE 100", region: "GLOBAL" as const, zone: "EU" },
      { symbol: "^GDAXI", name: "DAX", region: "GLOBAL" as const, zone: "EU" },
      { symbol: "^FCHI", name: "CAC 40", region: "GLOBAL" as const, zone: "EU" },
      { symbol: "^STOXX50E", name: "Euro Stoxx 50", region: "GLOBAL" as const, zone: "EU" },
      // Asia
      { symbol: "^N225", name: "Nikkei 225", region: "GLOBAL" as const, zone: "ASIA" },
      { symbol: "^HSI", name: "Hang Seng", region: "GLOBAL" as const, zone: "ASIA" },
      { symbol: "000001.SS", name: "Shanghai Composite", region: "GLOBAL" as const, zone: "ASIA" },
    ];
    const out: IndexQuote[] = [];
    // paralelo limitado
    await Promise.all(
      list.map(async (item) => {
        try {
          const q = await this.getQuote(item.symbol);
          if (q) {
            out.push({
              symbol: item.symbol,
              name: item.name,
              price: q.price,
              changePercent: q.changePercent,
              region: item.region,
              updatedAt: q.updatedAt,
              source: "yahoo",

              zone: item.zone,
            } as IndexQuote & { zone?: string });
          }
        } catch {
          /* */
        }
      })
    );
    return out;
  }
}
