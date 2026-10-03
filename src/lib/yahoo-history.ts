import { normalizeYahooSymbol } from "./market-data/types";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; MX Cartera Global/1.0)",
  Accept: "application/json",
};

const RANGE_MAP: Record<string, { range: string; interval: string }> = {
  "1d": { range: "1d", interval: "5m" },
  "5d": { range: "5d", interval: "15m" },
  "1mo": { range: "1mo", interval: "1d" },
  "6mo": { range: "6mo", interval: "1d" },
  "1y": { range: "1y", interval: "1d" },
  "5y": { range: "5y", interval: "1wk" },
};

export type Candle = { t: number; o: number; h: number; l: number; c: number };

export async function freeYahooHistory(symbol: string, rangeKey = "1y"): Promise<Candle[]> {
  const spec = RANGE_MAP[rangeKey] || RANGE_MAP["1y"];
  const sym = normalizeYahooSymbol(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=${spec.interval}&range=${spec.range}`;
  try {
    const res = await fetch(url, { headers: HEADERS, next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const ts: number[] = result?.timestamp || [];
    const q = result?.indicators?.quote?.[0] || {};
    const out: Candle[] = [];
    for (let i = 0; i < ts.length; i++) {
      const o = Number(q.open?.[i]);
      const h = Number(q.high?.[i]);
      const l = Number(q.low?.[i]);
      const c = Number(q.close?.[i]);
      if ([o, h, l, c].every((n) => Number.isFinite(n))) {
        out.push({ t: Number(ts[i]) * 1000, o, h, l, c });
      }
    }
    return out;
  } catch {
    return [];
  }
}
