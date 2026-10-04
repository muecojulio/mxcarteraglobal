import { detectRegion, detectCurrency, normalizeYahooSymbol } from "./market-data/types";
import type { SearchResult } from "./market-data/types";

const Y_HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; MX Cartera Global/1.0)", Accept: "application/json,text/plain,*/*" };
const N_HEADERS = { ...Y_HEADERS, Referer: "https://www.nasdaq.com/", "Accept-Language": "en-US,en;q=0.9" };

type JsonRecord = Record<string, unknown>;

export type FreeQuoteSummary = {
  price: number | null;
  marketCap: number | null;
  pe: number | null;
  peg: number | null;
  pb: number | null;
  ps: number | null;
  roe: number | null;
  roa: number | null;
  roi: number | null;
  revGrowth: number | null;
  epsGrowth: number | null;
  debtEquity: number | null;
  currentRatio: number | null;
  divYield: number | null;
  expenseRatio: number | null;
  high52: number | null;
  low52: number | null;
  avgVolume: number | null;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function record(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function raw(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (isRecord(value) && "raw" in value) {
    const n = Number(value.raw);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pct(value: unknown): number | null {
  const n = raw(value);
  if (n == null) return null;
  return Math.abs(n) <= 2 ? n * 100 : n;
}

async function yahooJson(url: string, revalidate = 300): Promise<unknown | null> {
  try {
    const res = await fetch(url, { headers: Y_HEADERS, next: { revalidate } });
    if (!res.ok) return null;
    return await res.json() as unknown;
  } catch {
    return null;
  }
}

async function nasdaqJson(url: string, revalidate = 900): Promise<unknown | null> {
  try {
    const res = await fetch(url, { headers: N_HEADERS, next: { revalidate } });
    if (!res.ok) return null;
    return await res.json() as unknown;
  } catch {
    return null;
  }
}

export async function freeYahooSummary(symbol: string): Promise<FreeQuoteSummary> {
  const sym = normalizeYahooSymbol(symbol);
  const [chart, summary] = await Promise.all([
    yahooJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`, 300),
    yahooJson(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=price,summaryDetail,defaultKeyStatistics,financialData,fundProfile`, 21600),
  ]);
  const chartResponse = record(record(chart).chart);
  const chartResult = record(array(chartResponse.result)[0]);
  const meta = record(chartResult.meta);
  const quoteSummary = record(record(summary).quoteSummary);
  const summaryResult = record(array(quoteSummary.result)[0]);
  const price = record(summaryResult.price);
  const summaryDetail = record(summaryResult.summaryDetail);
  const keyStatistics = record(summaryResult.defaultKeyStatistics);
  const financialData = record(summaryResult.financialData);
  let expenseRatio = raw(keyStatistics.annualReportExpenseRatio ?? keyStatistics.expenseRatio);
  if (expenseRatio != null && expenseRatio < 1) expenseRatio *= 100;
  return {
    price: raw(meta.regularMarketPrice) ?? raw(price.regularMarketPrice),
    marketCap: raw(price.marketCap) ?? raw(summaryDetail.marketCap),
    pe: raw(summaryDetail.trailingPE) ?? raw(keyStatistics.trailingPE),
    peg: raw(keyStatistics.pegRatio),
    pb: raw(summaryDetail.priceToBook) ?? raw(keyStatistics.priceToBook),
    ps: raw(summaryDetail.priceToSalesTrailing12Months),
    roe: pct(financialData.returnOnEquity),
    roa: pct(financialData.returnOnAssets),
    roi: pct(financialData.returnOnInvestment),
    revGrowth: pct(financialData.revenueGrowth),
    epsGrowth: pct(financialData.earningsGrowth),
    debtEquity: raw(financialData.debtToEquity),
    currentRatio: raw(financialData.currentRatio),
    divYield: pct(summaryDetail.dividendYield ?? summaryDetail.yield),
    expenseRatio,
    high52: raw(summaryDetail.fiftyTwoWeekHigh),
    low52: raw(summaryDetail.fiftyTwoWeekLow),
    avgVolume: raw(summaryDetail.averageVolume),
  };
}

export async function freeYahooDividends(symbol: string, range = "10y") {
  const sym = normalizeYahooSymbol(symbol);
  const data = await yahooJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=${range}&events=div%2Csplit`, 3600);
  const chartResponse = record(record(data).chart);
  const result = record(array(chartResponse.result)[0]);
  const events = record(result.events);
  if (!isRecord(events.dividends)) return [];
  const isMx = sym.endsWith(".MX") || detectRegion(sym) === "MX";
  const metadata = record(result.meta);
  const currency = metadata.currency === "MXN" || isMx ? "MXN" : "USD";
  return Object.values(events.dividends)
    .flatMap((value) => {
      const dividend = record(value);
      if (dividend.amount == null || dividend.date == null) return [];
      const timestamp = Number(dividend.date);
      const amount = Number(dividend.amount);
      const date = new Date(timestamp * 1000);
      if (!Number.isFinite(timestamp) || !Number.isFinite(amount) || !Number.isFinite(date.getTime())) return [];
      return [{ date: date.toISOString().slice(0, 10), amount, currency }];
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function freeNasdaqQuote(symbol: string, assetClass: "stocks" | "etf" = "stocks") {
  const sym = symbol.trim().toUpperCase();
  const data = await nasdaqJson(`https://api.nasdaq.com/api/quote/${encodeURIComponent(sym)}/summary?assetclass=${assetClass}`, 600);
  const d = record(record(data).data);
  if (!Object.keys(d).length) return null;
  const summary = record(d.summaryData);
  const value = (key: string) => {
    const row = record(summary[key]);
    if (row.value == null) return null;
    const n = Number(String(row.value).replace(/[$,% ,]/g, ""));
    return Number.isFinite(n) ? n : null;
  };
  const price = value("LastSalePrice") ?? value("LastPrice") ?? value("Last");
  if (price == null) return null;
  const previousClose = value("PreviousClose");
  const change = value("TodaysChange") ?? (previousClose != null ? price - previousClose : 0);
  return {
    symbol: sym,
    name: typeof d.companyName === "string" ? d.companyName : sym,
    price,
    change,
    changePercent: value("TodaysChangePercent") ?? (previousClose ? (change / previousClose) * 100 : 0),
    previousClose: previousClose ?? price - change,
    volume: value("ShareVolume"),
    currency: "USD",
    region: "US" as const,
    market: "NASDAQ",
    exchange: "NASDAQ",
    updatedAt: new Date().toISOString(),
    source: "nasdaq",
  };
}

function rowsOf(data: unknown): unknown[] {
  const payload = record(record(data).data);
  return Array.isArray(payload.rows) ? payload.rows : [];
}

export async function freeNasdaqCalendar(from: string, to: string, type: "earnings" | "dividends" | "ipo") {
  const qs = `fromdate=${encodeURIComponent(from)}&todate=${encodeURIComponent(to)}&limit=5000`;
  const data = await nasdaqJson(`https://api.nasdaq.com/api/calendar/${type}?${qs}`, 1800);
  return rowsOf(data);
}

export async function freeNasdaqScreener(exchange = "nasdaq") {
  const data = await nasdaqJson(`https://api.nasdaq.com/api/screener/stocks?exchange=${encodeURIComponent(exchange)}&limit=5000`, 3600);
  return rowsOf(data);
}

export async function freeYahooSearch(query: string): Promise<SearchResult[]> {
  const data = await yahooJson(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0`, 300);
  const quotes = array(record(data).quotes);
  return quotes.flatMap((value): SearchResult[] => {
    const quote = record(value);
    const symbol = typeof quote.symbol === "string" ? quote.symbol : "";
    if (!symbol || String(quote.quoteType || "").toLowerCase().includes("crypto")) return [];
    const region = detectRegion(symbol);
    return [{
      symbol,
      name: typeof quote.longname === "string" ? quote.longname : typeof quote.shortname === "string" ? quote.shortname : symbol,
      ...(typeof quote.exchange === "string" ? { exchange: quote.exchange } : {}),
      ...(typeof quote.quoteType === "string" ? { type: quote.quoteType } : {}),
      region,
      currency: detectCurrency(symbol, region),
    }];
  });
}

export async function publicFredCsv(series = "DGS10") {
  try {
    const res = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(series)}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const lines = (await res.text()).trim().split(/\r?\n/).slice(1).filter(Boolean);
    return {
      series,
      rows: lines.map((line) => {
        const [date, value] = line.split(",");
        const n = Number(value);
        return { date, value: Number.isFinite(n) ? n : null };
      }).filter((row) => row.date),
    };
  } catch {
    return null;
  }
}

export async function publicTreasuryDebt() {
  try {
    const res = await fetch("https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?page%5Bsize%5D=5&sort=-record_date", { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return { data: array(record(data).data), source: "treasury-fiscal-data" };
  } catch {
    return null;
  }
}

export async function publicTradingViewScan(symbols: string[]) {
  try {
    const res = await fetch("https://scanner.tradingview.com/america/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (compatible; MX Cartera Global/1.0)" },
      body: JSON.stringify({
        filter: [],
        options: { lang: "en" },
        symbols: { query: { types: [] }, tickers: symbols.map((symbol) => `NASDAQ:${normalizeYahooSymbol(symbol)}`) },
        columns: ["name", "close", "change", "volume"],
        sort: { sortBy: "market_cap_basic", sortOrder: "desc" },
        range: [0, Math.min(symbols.length, 100)],
      }),
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    return array(record(data).data);
  } catch {
    return [];
  }
}

export async function publicSecRecentIpos(from: string, to: string) {
  try {
    const res = await fetch(`https://efts.sec.gov/LATEST/search-index?q=S-1&forms=S-1%2CS-1%2FA%2C424B4&startdt=${encodeURIComponent(from)}&enddt=${encodeURIComponent(to)}&from=0&size=100`, {
      headers: { "User-Agent": process.env.SEC_USER_AGENT?.trim() || "MX Cartera Global/1.0 contacto-webmaster@example.com", Accept: "application/json" },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    const hits = array(record(record(data).hits).hits);
    return hits.flatMap((hit) => {
      const source = record(record(hit)._source);
      const date = String(source.filedAt || source.filingDate || "").slice(0, 10);
      if (!date) return [];
      const tickerValue = source.tickers;
      const symbol = Array.isArray(tickerValue)
        ? tickerValue.filter((ticker): ticker is string => typeof ticker === "string").join(", ")
        : String(tickerValue || "");
      return [{
        date,
        symbol,
        name: String(source.display_names || source.entityName || "SEC filing"),
        form: String(source.form || "S-1"),
        source: "sec-edgar",
      }];
    });
  } catch {
    return [];
  }
}
