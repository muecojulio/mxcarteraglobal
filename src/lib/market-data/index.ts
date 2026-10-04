import type { MarketDataProvider, Quote, SearchResult, IndexQuote } from "./types";
import { MockProvider } from "./mock-provider";
import { FinnhubProvider } from "./finnhub-provider";
import { DataBursatilProvider } from "./databursatil-provider";
import { FmpProvider } from "./fmp-provider";
import { TwelveDataProvider } from "./twelvedata-provider";
import { YahooProvider } from "./yahoo-provider";
import { PolygonProvider } from "./polygon-provider";
import { FinageProvider } from "./finage-provider";
import { detectRegion } from "./types";
export { detectRegion, detectAssetType } from "./types";
export * from "./types";
export { MockProvider } from "./mock-provider";
export { FinnhubProvider } from "./finnhub-provider";
export { DataBursatilProvider } from "./databursatil-provider";
export { FmpProvider } from "./fmp-provider";
export { TwelveDataProvider } from "./twelvedata-provider";
export { YahooProvider } from "./yahoo-provider";

async function fetchYahooDividends(symbol: string) {
  const sym = symbol.trim().toUpperCase();
  const isMx = sym.endsWith(".MX") || detectRegion(sym) === "MX";
  const candidates = [sym];
  if (isMx && !sym.includes(".")) candidates.push(`${sym}.MX`);
  if (sym.endsWith(".MX")) candidates.push(sym.replace(".MX", ""));
  for (const candidate of candidates) {
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(candidate)}?interval=1d&range=10y&events=div`, { headers: { "User-Agent": "Mozilla/5.0 (compatible; MX Cartera Global/1.0)" }, next: { revalidate: 3600 } });
      if (!res.ok) continue;
      const data = await res.json();
      const result = data?.chart?.result?.[0]; const divs = result?.events?.dividends;
      if (!divs || typeof divs !== "object") continue;
      const currency = result?.meta?.currency === "MXN" || isMx ? "MXN" : "USD";
      const rows = Object.values(divs as Record<string, { amount?: number; date?: number }>).filter((d) => d && d.amount != null && d.date != null).map((d) => ({ date: new Date(Number(d.date) * 1000).toISOString().slice(0, 10), amount: Number(d.amount), currency })).sort((a, b) => b.date.localeCompare(a.date));
      if (rows.length) return rows;
    } catch { /* next */ }
  }
  return [];
}
async function fetchFinnhubDividends(symbol: string, token: string) {
  try {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 10 * 365 * 86400000).toISOString().slice(0, 10);
    const res = await fetch(`https://finnhub.io/api/v1/stock/dividend?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&token=${encodeURIComponent(token)}`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];
    return data.flatMap((value: unknown) => {
      if (typeof value !== "object" || value === null) return [];
      const dividend = value as Record<string, unknown>;
      if (dividend.amount == null || !dividend.date) return [];
      const amount = Number(dividend.amount);
      if (!Number.isFinite(amount)) return [];
      return [{ date: String(dividend.date).slice(0, 10), amount, currency: "USD" }];
    });
  } catch { return []; }
}

class CompositeProvider implements MarketDataProvider {
  name = "composite";
  private mx: DataBursatilProvider | null;
  private us: FinnhubProvider | null;
  private twelve: TwelveDataProvider | null;
  private yahoo: YahooProvider;
  private polygon: PolygonProvider | null;
  private finage: FinageProvider | null;
  private fmp: FmpProvider | null;
  private mock = new MockProvider();
  constructor(opts: { dbToken?: string; finnhubKey?: string; fmpKey?: string; twelveKey?: string; polygonKey?: string; finageKey?: string }) {
    this.mx = opts.dbToken ? new DataBursatilProvider(opts.dbToken) : null;
    this.us = opts.finnhubKey ? new FinnhubProvider(opts.finnhubKey) : null;
    this.twelve = opts.twelveKey ? new TwelveDataProvider(opts.twelveKey) : null;
    this.yahoo = new YahooProvider();
    this.polygon = opts.polygonKey ? new PolygonProvider(opts.polygonKey) : null;
    this.finage = opts.finageKey ? new FinageProvider(opts.finageKey) : null;
    this.fmp = opts.fmpKey ? new FmpProvider(opts.fmpKey) : null;
  }
  async getQuote(symbol: string): Promise<Quote | null> {
    const region = detectRegion(symbol);
    if (region === "MX" && this.mx) { const q = await this.mx.getQuote(symbol); if (q) return q; }
    if (region === "US" && this.us) { const q = await this.us.getQuote(symbol); if (q && q.source === "finnhub") return q; }
    if (region === "US" && this.polygon) { const q = await this.polygon.getQuote(symbol); if (q) return q; }
    if (region === "US" && this.finage) { const q = await this.finage.getQuote(symbol); if (q) return q; }
    const yq = await this.yahoo.getQuote(symbol); if (yq) return yq;
    if (this.twelve) { const q2 = await this.twelve.getQuote(symbol); if (q2) return q2; }
    return this.mock.getQuote(symbol);
  }
  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const out: Quote[] = [];
    for (const s of symbols) { const q = await this.getQuote(s); if (q) out.push(q); }
    return out;
  }
  async search(query: string): Promise<SearchResult[]> {
    const results = [...(await this.yahoo.search(query)), ...(this.mx ? await this.mx.search(query) : []), ...(this.us ? await this.us.search(query) : [])];
    if (!results.length) return this.mock.search(query);
    const seen = new Set<string>();
    return results.filter((r) => { const k = r.symbol.toUpperCase(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 20);
  }
  async getIndices(): Promise<IndexQuote[]> {
    const idx = await this.yahoo.getIndices(); if (idx.length) return idx;
    if (this.us) { const u = await this.us.getIndices(); if (u.length) return u; }
    return this.mock.getIndices();
  }
  async getDividends(symbol: string) {
    const sym = symbol.trim().toUpperCase();
    if (detectRegion(sym) === "MX" && this.mx) { try { const divs = await this.mx.getDividends(sym); if (divs.length) return divs.map((d) => ({ date: d.date, amount: d.amount, currency: d.currency || "MXN", exDate: d.exDate })); } catch { /* next */ } }
    if (this.fmp) { try { const fmpDivs = await this.fmp.getDividends(sym); if (fmpDivs.length) return fmpDivs; } catch { /* next */ } }
    const fh = process.env.FINNHUB_API_KEY?.trim(); if (fh) { const fhDivs = await fetchFinnhubDividends(sym, fh); if (fhDivs.length) return fhDivs; }
    return fetchYahooDividends(sym);
  }
}
let _provider: CompositeProvider | null = null;
export function getMarketDataProvider(): MarketDataProvider {
  if (!_provider) _provider = new CompositeProvider({ dbToken: process.env.DATABURSATIL_TOKEN?.trim(), finnhubKey: process.env.FINNHUB_API_KEY?.trim(), fmpKey: process.env.FMP_API_KEY?.trim(), twelveKey: process.env.TWELVEDATA_API_KEY?.trim(), polygonKey: process.env.POLYGON_API_KEY?.trim() || process.env.MASSIVE_API_KEY?.trim(), finageKey: process.env.FINAGE_API_KEY?.trim() });
  return _provider;
}
export function getCompositeProvider(): CompositeProvider { return getMarketDataProvider() as CompositeProvider; }
export function isUsingRealData(): boolean { return true; }
export function getDataSources(): string[] {
  const sources = ["yahoo"];
  if (process.env.DATABURSATIL_TOKEN?.trim()) sources.push("databursatil");
  if (process.env.FINNHUB_API_KEY?.trim()) sources.push("finnhub");
  if (process.env.FMP_API_KEY?.trim()) sources.push("fmp");
  if (process.env.TWELVEDATA_API_KEY?.trim()) sources.push("twelvedata");
  if (process.env.POLYGON_API_KEY?.trim() || process.env.MASSIVE_API_KEY?.trim()) sources.push("polygon");
  if (process.env.FINAGE_API_KEY?.trim()) sources.push("finage");
  return sources;
}
