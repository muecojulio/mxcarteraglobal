/**
 * Financial Modeling Prep — dividendos históricos EE.UU. (plan free)
 * Endpoint estable: /stable/dividends?symbol=AAPL
 */

export type FmpDividend = {
  date: string;
  dividend: number;
  adjDividend?: number;
  paymentDate?: string;
  recordDate?: string;
  declarationDate?: string;
  yield?: number;
  frequency?: string;
};

export class FmpProvider {
  name = "fmp";
  private apiKey: string;
  private base = "https://financialmodelingprep.com/stable";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetchJson<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
    const url = new URL(`${this.base}${path}`);
    url.searchParams.set("apikey", this.apiKey);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    try {
      const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.["Error Message"] || data?.error) {
        console.error("FMP error:", data["Error Message"] || data.error);
        return null;
      }
      return data as T;
    } catch (err) {
      console.error("FMP fetch failed:", err);
      return null;
    }
  }

  async getDividends(symbol: string, limit = 40): Promise<
    Array<{
      date: string;
      amount: number;
      paymentDate?: string;
      recordDate?: string;
      declarationDate?: string;
      frequency?: string;
      currency: string;
    }>
  > {
    const data = await this.fetchJson<FmpDividend[]>("/dividends", {
      symbol: symbol.toUpperCase(),
    });

    if (!Array.isArray(data) || data.length === 0) return [];

    return data.slice(0, limit).map((d) => ({
      date: d.date,
      amount: d.adjDividend ?? d.dividend ?? 0,
      paymentDate: d.paymentDate,
      recordDate: d.recordDate,
      declarationDate: d.declarationDate,
      frequency: d.frequency,
      currency: "USD",
    }));
  }
}
