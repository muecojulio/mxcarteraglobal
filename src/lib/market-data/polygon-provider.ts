import type { MarketDataProvider, Quote, SearchResult } from "./types";
import { detectRegion, detectCurrency } from "./types";

/**
 * Polygon.io / Massive — plan Basic gratis (~5 req/min, datos ~15 min delay).
 * Solo US. Respaldo cuando Finnhub falla.
 *
 * Endpoints usados:
 * - GET /v2/aggs/ticker/{ticker}/prev
 * - GET /v2/snapshot/locale/us/markets/stocks/tickers/{ticker} (si el plan lo permite)
 */
export class PolygonProvider implements MarketDataProvider {
  name = "polygon";
  private apiKey: string;
  private base = "https://api.polygon.io";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetchJson<T>(path: string): Promise<T | null> {
    const url = `${this.base}${path}${path.includes("?") ? "&" : "?"}apiKey=${this.apiKey}`;
    try {
      const res = await fetch(url, { next: { revalidate: 60 } });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    const sym = symbol.toUpperCase();
    const region = detectRegion(sym);
    if (region === "MX" || sym.includes(".")) {
      // Solo US simples en free típico
      if (sym.includes(".") && !sym.endsWith(".US")) return null;
    }
    if (region !== "US") return null;

    // 1) Snapshot ticker (mejor si está en el plan)
    const snap = await this.fetchJson<{
      status?: string;
      ticker?: {
        ticker?: string;
        day?: { c?: number; o?: number; h?: number; l?: number; v?: number };
        prevDay?: { c?: number };
        todaysChange?: number;
        todaysChangePerc?: number;
        updated?: number;
      };
    }>(`/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(sym)}`);

    if (snap?.ticker?.day?.c) {
      const t = snap.ticker;
      const price = t.day!.c!;
      const prev = t.prevDay?.c;
      const change =
        t.todaysChange ??
        (prev != null ? price - prev : 0);
      const changePercent =
        t.todaysChangePerc ??
        (prev ? ((price - prev) / prev) * 100 : 0);
      return {
        symbol: sym,
        name: sym,
        price,
        change,
        changePercent,
        previousClose: prev,
        open: t.day?.o,
        high: t.day?.h,
        low: t.day?.l,
        volume: t.day?.v,
        currency: "USD",
        region: "US",
        market: "US",
        updatedAt: t.updated
          ? new Date(t.updated / 1e6).toISOString()
          : new Date().toISOString(),
        source: "polygon",
      };
    }

    // 2) Prev day aggregate (muy disponible en Basic)
    const prev = await this.fetchJson<{
      status?: string;
      results?: Array<{
        T?: string;
        c?: number;
        o?: number;
        h?: number;
        l?: number;
        v?: number;
        t?: number;
      }>;
    }>(`/v2/aggs/ticker/${encodeURIComponent(sym)}/prev?adjusted=true`);

    const r = prev?.results?.[0];
    if (r?.c) {
      return {
        symbol: sym,
        name: sym,
        price: r.c,
        change: 0,
        changePercent: 0,
        previousClose: r.c,
        open: r.o,
        high: r.h,
        low: r.l,
        volume: r.v,
        currency: detectCurrency(sym, "US"),
        region: "US",
        market: "US",
        updatedAt: r.t
          ? new Date(r.t).toISOString()
          : new Date().toISOString(),
        source: "polygon",
      };
    }

    return null;
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
    // Secuencial suave (free = 5/min)
    const out: Quote[] = [];
    for (const s of unique.slice(0, 5)) {
      const q = await this.getQuote(s);
      if (q) out.push(q);
      await new Promise((r) => setTimeout(r, 250));
    }
    return out;
  }

  async search(query: string): Promise<SearchResult[]> {
    const q = query.trim();
    if (!q) return [];
    const data = await this.fetchJson<{
      results?: Array<{
        ticker?: string;
        name?: string;
        primary_exchange?: string;
        type?: string;
      }>;
    }>(
      `/v3/reference/tickers?search=${encodeURIComponent(q)}&active=true&limit=10`
    );
    return (data?.results || []).map((r) => ({
      symbol: r.ticker || "",
      name: r.name || r.ticker || "",
      exchange: r.primary_exchange,
      type: r.type,
      region: "US" as const,
      currency: "USD",
    }));
  }
}
