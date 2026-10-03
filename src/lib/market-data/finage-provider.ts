import type { MarketDataProvider, Quote, SearchResult } from "./types";
import { detectRegion, detectCurrency } from "./types";
export class FinageProvider implements MarketDataProvider {
  name = "finage";
  private apiKey: string;
  private base = "https://api.finage.co.uk";
  constructor(apiKey: string) { this.apiKey = apiKey; }
  private async fetchJson<T>(path: string): Promise<T | null> {
    const sep = path.includes("?") ? "&" : "?";
    const url = `${this.base}${path}${sep}apikey=${this.apiKey}`;
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 30 } });
      if (!res.ok) return null;
      const data = await res.json();
      if (data && typeof data === "object" && "error" in data) return null;
      return data as T;
    } catch { return null; }
  }
  async getQuote(symbol: string): Promise<Quote | null> {
    const sym = symbol.toUpperCase();
    const region = detectRegion(sym);
    if (region === "MX" || sym.endsWith(".MX")) return null;
    const trade = await this.fetchJson<{ price?: number }>(`/last/trade/stock/${encodeURIComponent(sym)}`);
    let price = trade?.price != null && Number.isFinite(Number(trade.price)) ? Number(trade.price) : null;
    if (price == null) {
      const q = await this.fetchJson<{ ask?: number; bid?: number }>(`/last/stock/${encodeURIComponent(sym)}`);
      if (q?.ask != null && q?.bid != null) price = (Number(q.ask) + Number(q.bid)) / 2;
      else if (q?.ask != null) price = Number(q.ask);
      else if (q?.bid != null) price = Number(q.bid);
    }
    if (price == null || !Number.isFinite(price) || price <= 0) return null;
    let prev: number | null = null;
    const prevRes = await this.fetchJson<{ close?: number; price?: number; prevClose?: number; results?: Array<{ c?: number }> }>(`/agg/stock/prev-close/${encodeURIComponent(sym)}`);
    if (prevRes) {
      const c = prevRes.results?.[0]?.c ?? prevRes.close ?? prevRes.prevClose ?? prevRes.price ?? null;
      if (c != null && Number.isFinite(Number(c))) prev = Number(c);
    }
    const change = prev != null ? price - prev : 0;
    const changePercent = prev != null && prev !== 0 ? (change / prev) * 100 : 0;
    return { symbol: sym, name: sym, price, change, changePercent, previousClose: prev ?? undefined, currency: detectCurrency(sym, "US"), region: region === "GLOBAL" ? "GLOBAL" : "US", market: "US", updatedAt: new Date().toISOString(), source: "finage" };
  }
  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const out: Quote[] = [];
    for (const s of [...new Set(symbols.map((x) => x.toUpperCase()))].slice(0, 8)) { const q = await this.getQuote(s); if (q) out.push(q); await new Promise((r) => setTimeout(r, 150)); }
    return out;
  }
  async search(query: string): Promise<SearchResult[]> {
    const q = query.trim(); if (!q) return [];
    const data = await this.fetchJson<{ symbols?: Array<{ symbol?: string; name?: string }> }>(`/symbol-list/us-stock?page=1&search=${encodeURIComponent(q)}`);
    return (data?.symbols || []).slice(0, 10).map((r) => ({ symbol: (r.symbol || "").toUpperCase(), name: r.name || r.symbol || "", region: "US" as const, currency: "USD", type: "stock" }));
  }
}
