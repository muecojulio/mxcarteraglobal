import type {
  MarketDataProvider,
  Quote,
  SearchResult,
  IndexQuote,
} from "./types";
import { detectRegion, detectCurrency } from "./types";
import { MockProvider } from "./mock-provider";

const BASE = "https://finnhub.io/api/v1";

/**
 * Proveedor Finnhub (plan gratuito).
 * - Excelente cobertura EE.UU.
 * - Símbolos .MX no disponibles en free → se usa mock automáticamente
 * - Dividendos históricos requieren plan de pago
 */
export class FinnhubProvider implements MarketDataProvider {
  name = "finnhub";
  private apiKey: string;
  private mock = new MockProvider();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetchJson<T>(
    path: string,
    params: Record<string, string> = {}
  ): Promise<T | null> {
    const url = new URL(`${BASE}${path}`);
    url.searchParams.set("token", this.apiKey);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    try {
      const res = await fetch(url.toString(), {
        next: { revalidate: 30 },
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.error) return null;
      return data as T;
    } catch {
      return null;
    }
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    const sym = symbol.toUpperCase();
    const region = detectRegion(sym);

    // Finnhub free no cubre bien BMV (.MX) → mock
    if (region === "MX" || sym.endsWith(".MX")) {
      return this.mock.getQuote(sym);
    }

    const quoteData = await this.fetchJson<{
      c: number;
      d: number;
      dp: number;
      h: number;
      l: number;
      o: number;
      pc: number;
      t: number;
    }>("/quote", { symbol: sym });

    if (!quoteData || !quoteData.c || quoteData.c === 0) {
      // Dejar que Composite pruebe Polygon / Yahoo
      return null;
    }

    const profile = await this.fetchJson<{
      name?: string;
      exchange?: string;
      currency?: string;
    }>("/stock/profile2", { symbol: sym });

    return {
      symbol: sym,
      name: profile?.name || sym,
      price: quoteData.c,
      change: quoteData.d ?? 0,
      changePercent: quoteData.dp ?? 0,
      previousClose: quoteData.pc,
      open: quoteData.o,
      high: quoteData.h,
      low: quoteData.l,
      currency: profile?.currency || detectCurrency(sym, region),
      region,
      exchange: profile?.exchange,
      market: profile?.exchange,
      updatedAt: new Date(
        (quoteData.t || Date.now() / 1000) * 1000
      ).toISOString(),
      source: "finnhub",
    };
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
    const results = await Promise.all(unique.map((s) => this.getQuote(s)));
    return results.filter((q): q is Quote => q !== null);
  }

  async search(query: string): Promise<SearchResult[]> {
    const data = await this.fetchJson<{
      count: number;
      result: Array<{
        symbol: string;
        description: string;
        displaySymbol: string;
        type: string;
      }>;
    }>("/search", { q: query });

    if (!data?.result?.length) {
      return this.mock.search(query);
    }

    return data.result.slice(0, 15).map((r) => {
      const region = detectRegion(r.symbol);
      return {
        symbol: r.symbol,
        name: r.description || r.displaySymbol,
        type: r.type,
        region,
        currency: detectCurrency(r.symbol, region),
      };
    });
  }

  async getIndices(): Promise<IndexQuote[]> {
    // En free tier los índices con ^ a veces fallan; usamos mock fiable
    // y opcionalmente intentamos algunos ETFs que siguen índices
    const etfProxies: { symbol: string; name: string; region: "US" | "MX" }[] = [
      { symbol: "SPY", name: "S&P 500 (SPY)", region: "US" },
      { symbol: "QQQ", name: "Nasdaq 100 (QQQ)", region: "US" },
      { symbol: "DIA", name: "Dow Jones (DIA)", region: "US" },
    ];

    const live: IndexQuote[] = [];
    for (const s of etfProxies) {
      const q = await this.getQuote(s.symbol);
      if (q && q.source === "finnhub") {
        live.push({
          symbol: s.symbol,
          name: s.name,
          price: q.price,
          changePercent: q.changePercent,
          region: s.region,
          updatedAt: q.updatedAt,
          source: "finnhub",
        });
      }
    }

    if (live.length > 0) {
      // Añadir IPC mock para México
      const mockIdx = await this.mock.getIndices();
      const ipc = mockIdx.find((i) => i.region === "MX");
      if (ipc) live.push(ipc);
      return live;
    }

    return this.mock.getIndices();
  }
}
