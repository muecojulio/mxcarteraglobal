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

/**
 * Routing (sin Alpaca):
 * - MX → DataBursatil
 * - US → Finnhub → Yahoo
 * - GLOBAL → Yahoo → Twelve Data
 * - Dividendos US → FMP | MX → DataBursatil
 */

/** Dividendos vía Yahoo — acciones, ETFs y FIBRAs (.MX) */
async function fetchYahooDividends(symbol: string): Promise<
  Array<{ date: string; amount: number; currency: string }>
> {
  const sym = symbol.trim().toUpperCase();
  const isMx = sym.endsWith(".MX") || detectRegion(sym) === "MX";
  const candidates = [sym];
  // Variantes útiles en Yahoo
  if (isMx && !sym.includes(".")) candidates.push(`${sym}.MX`);
  if (sym.endsWith(".MX")) candidates.push(sym.replace(".MX", ""));

  for (const candidate of candidates) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        candidate
      )}?interval=1d&range=10y&events=div`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MX Cartera Global/1.0)" },
        next: { revalidate: 3600 },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const result = data?.chart?.result?.[0];
      const divs = result?.events?.dividends;
      if (!divs || typeof divs !== "object") continue;
      const currency =
        result?.meta?.currency === "MXN" || isMx ? "MXN" : "USD";
      const rows = Object.values(
        divs as Record<string, { amount?: number; date?: number }>
      )
        .filter((d) => d && d.amount != null && d.date != null)
        .map((d) => ({
          date: new Date(Number(d.date) * 1000).toISOString().slice(0, 10),
          amount: Number(d.amount),
          currency,
        }))
        .sort((a, b) => b.date.localeCompare(a.date));
      if (rows.length) return rows;
    } catch {
      /* siguiente candidato */
    }
  }
  return [];
}

/** Finnhub dividendos (acciones US; algunos ETF) */
async function fetchFinnhubDividends(
  symbol: string,
  token: string
): Promise<Array<{ date: string; amount: number; currency: string }>> {
  try {
    const to = new Date().toISOString().slice(0, 10);
    const fromDate = new Date();
    fromDate.setFullYear(fromDate.getFullYear() - 10);
    const from = fromDate.toISOString().slice(0, 10);
    const url = `https://finnhub.io/api/v1/stock/dividend2?symbol=${encodeURIComponent(
      symbol
    )}&from=${from}&to=${to}&token=${token}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    const list = data?.data || data || [];
    if (!Array.isArray(list) || !list.length) return [];
    return list
      .map((d: { amount?: number; date?: string; payDate?: string }) => ({
        date: String(d.date || d.payDate || "").slice(0, 10),
        amount: Number(d.amount) || 0,
        currency: "USD",
      }))
      .filter((d: { date: string; amount: number }) => d.date && d.amount > 0)
      .sort((a: { date: string }, b: { date: string }) =>
        b.date.localeCompare(a.date)
      );
  } catch {
    return [];
  }
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

  constructor(opts: {
    dbToken?: string;
    finnhubKey?: string;
    fmpKey?: string;
    twelveKey?: string;
    polygonKey?: string;
    finageKey?: string;
  }) {
    this.mx = opts.dbToken ? new DataBursatilProvider(opts.dbToken) : null;
    this.us = opts.finnhubKey ? new FinnhubProvider(opts.finnhubKey) : null;
    this.twelve = opts.twelveKey ? new TwelveDataProvider(opts.twelveKey) : null;
    this.yahoo = new YahooProvider();
    this.polygon = opts.polygonKey
      ? new PolygonProvider(opts.polygonKey)
      : null;
    this.finage = opts.finageKey ? new FinageProvider(opts.finageKey) : null;
    this.fmp = opts.fmpKey ? new FmpProvider(opts.fmpKey) : null;
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    const region = detectRegion(symbol);

    if (region === "MX" && this.mx) {
      const q = await this.mx.getQuote(symbol);
      if (q) return q;
    }

    if (region === "US" && this.us) {
      const q = await this.us.getQuote(symbol);
      if (q && q.source === "finnhub") return q;
    }
    if (region === "US" && this.polygon) {
      const q = await this.polygon.getQuote(symbol);
      if (q) return q;
    }
    if (region === "US" && this.finage) {
      const q = await this.finage.getQuote(symbol);
      if (q) return q;
    }

    if (region === "GLOBAL") {
      const q = await this.yahoo.getQuote(symbol);
      if (q) return q;
      if (this.twelve) {
        const q2 = await this.twelve.getQuote(symbol);
        if (q2) return q2;
      }
    }

    if (this.us) {
      const q = await this.us.getQuote(symbol);
      if (q) return q;
    }
    const yq = await this.yahoo.getQuote(symbol);
    if (yq) return yq;

    return this.mock.getQuote(symbol);
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const mxSyms = symbols.filter((s) => detectRegion(s) === "MX");
    const usSyms = symbols.filter((s) => detectRegion(s) === "US");
    const globalSyms = symbols.filter((s) => detectRegion(s) === "GLOBAL");

    const [mxQuotes, usQuotes, globalQuotes] = await Promise.all([
      this.mx && mxSyms.length
        ? this.mx.getQuotes(mxSyms)
        : Promise.resolve([] as Quote[]),
      this.us && usSyms.length
        ? this.us.getQuotes(usSyms)
        : Promise.resolve([] as Quote[]),
      globalSyms.length
        ? this.yahoo.getQuotes(globalSyms)
        : Promise.resolve([] as Quote[]),
    ]);

    let usFinal = usQuotes;
    if (this.polygon && usSyms.length) {
      const have = new Set(usQuotes.map((q) => q.symbol.toUpperCase()));
      const missing = usSyms.filter((s) => !have.has(s.toUpperCase()));
      if (missing.length) {
        const poly = await this.polygon.getQuotes(missing);
        usFinal = [...usQuotes, ...poly];
      }
    }
    if (this.finage && usSyms.length) {
      const have = new Set(usFinal.map((q) => q.symbol.toUpperCase()));
      const missing = usSyms.filter((s) => !have.has(s.toUpperCase()));
      if (missing.length) {
        const fg = await this.finage.getQuotes(missing);
        usFinal = [...usFinal, ...fg];
      }
    }

    const found = new Set(
      [...mxQuotes, ...usFinal, ...globalQuotes].map((q) =>
        q.symbol.toUpperCase()
      )
    );
    const missing = symbols.filter((s) => !found.has(s.toUpperCase()));
    const extra: Quote[] = [];
    for (const s of missing) {
      const q = await this.getQuote(s);
      if (q) extra.push(q);
    }

    return [...mxQuotes, ...usFinal, ...globalQuotes, ...extra];
  }

  async search(query: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    results.push(...(await this.yahoo.search(query)));
    if (this.mx) results.push(...(await this.mx.search(query)));
    if (this.us) results.push(...(await this.us.search(query)));
    if (results.length === 0) return this.mock.search(query);
    const seen = new Set<string>();
    return results
      .filter((r) => {
        const k = r.symbol.toUpperCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 20);
  }

  async getIndices(): Promise<IndexQuote[]> {
    const idx = await this.yahoo.getIndices();
    if (idx.length) return idx;
    if (this.us) {
      const u = await this.us.getIndices();
      if (u.length) return u;
    }
    return this.mock.getIndices();
  }

  async getDividends(symbol: string) {
    const sym = symbol.trim().toUpperCase();
    const region = detectRegion(sym);

    // 1) México / FIBRAs → DataBursatil
    if (region === "MX" && this.mx) {
      try {
        const divs = await this.mx.getDividends(sym);
        if (divs.length) {
          return divs.map((d) => ({
            date: d.date,
            amount: d.amount,
            currency: d.currency || "MXN",
            exDate: d.exDate,
            type: d.type,
          }));
        }
      } catch {
        /* continuar */
      }
    }

    // 2) FMP (acciones US; algunos ETF en plan free)
    if (this.fmp) {
      try {
        const fmpDivs = await this.fmp.getDividends(sym);
        if (fmpDivs.length) return fmpDivs;
      } catch {
        /* continuar */
      }
    }

    // 3) Finnhub
    const fh = process.env.FINNHUB_API_KEY?.trim();
    if (fh) {
      const fhDivs = await fetchFinnhubDividends(sym, fh);
      if (fhDivs.length) return fhDivs;
    }

    // 4) Yahoo — cobertura amplia: acciones, ETFs, FIBRAs (.MX)
    const y = await fetchYahooDividends(sym);
    if (y.length) return y;

    return [];
  }
}

let _provider: CompositeProvider | null = null;

export function getMarketDataProvider(): MarketDataProvider {
  if (!_provider) {
    _provider = new CompositeProvider({
      dbToken: process.env.DATABURSATIL_TOKEN?.trim(),
      finnhubKey: process.env.FINNHUB_API_KEY?.trim(),
      fmpKey: process.env.FMP_API_KEY?.trim(),
      twelveKey: process.env.TWELVEDATA_API_KEY?.trim(),
      polygonKey:
        process.env.POLYGON_API_KEY?.trim() ||
        process.env.MASSIVE_API_KEY?.trim(),
      finageKey: process.env.FINAGE_API_KEY?.trim(),
    });
  }
  return _provider;
}

export function getCompositeProvider(): CompositeProvider {
  return getMarketDataProvider() as CompositeProvider;
}

export function isUsingRealData(): boolean {
  return true;
}

export function getDataSources(): string[] {
  const sources: string[] = ["yahoo"];
  if (process.env.DATABURSATIL_TOKEN?.trim()) sources.push("databursatil");
  if (process.env.FINNHUB_API_KEY?.trim()) sources.push("finnhub");
  if (process.env.FMP_API_KEY?.trim()) sources.push("fmp");
  if (process.env.TWELVEDATA_API_KEY?.trim()) sources.push("twelvedata");
  if (
    process.env.POLYGON_API_KEY?.trim() ||
    process.env.MASSIVE_API_KEY?.trim()
  )
    sources.push("polygon");
  if (process.env.FINAGE_API_KEY?.trim()) sources.push("finage");
  return sources;
}
