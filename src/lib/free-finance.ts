import {
  detectAssetType,
  detectCurrency,
  detectRegion,
  isExcludedInstrument,
  normalizeYahooSymbol,
} from "./market-data/types";
import type { Quote, SearchResult } from "./market-data/types";

const Y_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; MX Cartera Global/1.0)",
  Accept: "application/json,text/plain,*/*",
};
const N_HEADERS = {
  ...Y_HEADERS,
  Referer: "https://www.nasdaq.com/",
  "Accept-Language": "en-US,en;q=0.9",
};
const SEC_USER_AGENT =
  process.env.SEC_USER_AGENT?.trim() ||
  "MXCarteraGlobal/1.0 (+https://github.com/muecojulio/mxcarteraglobal)";

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
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  name: string | null;
  exchange: string | null;
  currency: string | null;
};

export type PublicTradingViewQuote = Quote & { marketCap?: number };

export type PublicSecFinancial = {
  year: number;
  revenue: number | null;
  netIncome: number | null;
  assets: number | null;
  equity: number | null;
  liabilities: number | null;
  filedAt?: string;
};

export type PublicSecCompanyFacts = {
  symbol: string;
  cik: string;
  name: string;
  source: "sec-edgar";
  financials: PublicSecFinancial[];
  filings: Array<{ date: string; form: string; accession: string; document?: string }>;
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

async function jsonFetch(
  url: string,
  headers: HeadersInit,
  revalidate: number
): Promise<unknown | null> {
  try {
    const res = await fetch(url, { headers, next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

async function yahooJson(url: string, revalidate = 300): Promise<unknown | null> {
  return jsonFetch(url, Y_HEADERS, revalidate);
}

async function nasdaqJson(url: string, revalidate = 900): Promise<unknown | null> {
  return jsonFetch(url, N_HEADERS, revalidate);
}

async function secJson(url: string, revalidate = 3600): Promise<unknown | null> {
  return jsonFetch(
    url,
    { "User-Agent": SEC_USER_AGENT, Accept: "application/json" },
    revalidate
  );
}

/** Fundamentals públicas de Yahoo Finance (sin API key; endpoint no oficial). */
export async function freeYahooSummary(symbol: string): Promise<FreeQuoteSummary> {
  const sym = normalizeYahooSymbol(symbol);
  const empty: FreeQuoteSummary = {
    price: null,
    marketCap: null,
    pe: null,
    peg: null,
    pb: null,
    ps: null,
    roe: null,
    roa: null,
    roi: null,
    revGrowth: null,
    epsGrowth: null,
    debtEquity: null,
    currentRatio: null,
    divYield: null,
    expenseRatio: null,
    high52: null,
    low52: null,
    avgVolume: null,
    dayHigh: null,
    dayLow: null,
    volume: null,
    name: null,
    exchange: null,
    currency: null,
  };
  if (isExcludedInstrument(sym)) return empty;

  const [chart, summary] = await Promise.all([
    yahooJson(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`,
      300
    ),
    yahooJson(
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=price,summaryDetail,defaultKeyStatistics,financialData,fundProfile`,
      21_600
    ),
  ]);
  const chartResult = record(array(record(record(chart).chart).result)[0]);
  const meta = record(chartResult.meta);
  const summaryResult = record(array(record(record(summary).quoteSummary).result)[0]);
  const priceInfo = record(summaryResult.price);
  const summaryDetail = record(summaryResult.summaryDetail);
  const keyStatistics = record(summaryResult.defaultKeyStatistics);
  const financialData = record(summaryResult.financialData);
  const fundProfile = record(summaryResult.fundProfile);

  let expenseRatio = raw(
    keyStatistics.annualReportExpenseRatio ??
      keyStatistics.expenseRatio ??
      fundProfile.annualReportExpenseRatio ??
      fundProfile.expenseRatio
  );
  if (expenseRatio != null && expenseRatio > 0 && expenseRatio < 1) expenseRatio *= 100;

  return {
    price: raw(meta.regularMarketPrice) ?? raw(priceInfo.regularMarketPrice),
    marketCap: raw(priceInfo.marketCap) ?? raw(summaryDetail.marketCap),
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
    high52: raw(summaryDetail.fiftyTwoWeekHigh) ?? raw(keyStatistics.fiftyTwoWeekHigh),
    low52: raw(summaryDetail.fiftyTwoWeekLow) ?? raw(keyStatistics.fiftyTwoWeekLow),
    avgVolume: raw(summaryDetail.averageVolume) ?? raw(summaryDetail.averageDailyVolume10Day),
    dayHigh: raw(priceInfo.regularMarketDayHigh) ?? raw(summaryDetail.dayHigh),
    dayLow: raw(priceInfo.regularMarketDayLow) ?? raw(summaryDetail.dayLow),
    volume: raw(priceInfo.regularMarketVolume) ?? raw(summaryDetail.volume),
    name:
      (typeof meta.longName === "string" && meta.longName) ||
      (typeof meta.shortName === "string" && meta.shortName) ||
      (typeof priceInfo.longName === "string" && priceInfo.longName) ||
      (typeof priceInfo.shortName === "string" && priceInfo.shortName) ||
      null,
    exchange:
      (typeof meta.exchangeName === "string" && meta.exchangeName) ||
      (typeof priceInfo.exchangeName === "string" && priceInfo.exchangeName) ||
      null,
    currency:
      (typeof meta.currency === "string" && meta.currency) ||
      (typeof priceInfo.currency === "string" && priceInfo.currency) ||
      null,
  };
}

/** Historial público de distribuciones/dividendos Yahoo (sin API key). */
export async function freeYahooDividends(symbol: string, range = "10y") {
  const sym = normalizeYahooSymbol(symbol);
  if (isExcludedInstrument(sym)) return [];
  const data = await yahooJson(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=${encodeURIComponent(range)}&events=div%2Csplit`,
    3600
  );
  const result = record(array(record(record(data).chart).result)[0]);
  const events = record(result.events);
  if (!isRecord(events.dividends)) return [];
  const metadata = record(result.meta);
  let currency =
    (typeof metadata.currency === "string" && metadata.currency) ||
    detectCurrency(sym, detectRegion(sym));
  if (currency === "GBp") currency = "GBP";

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

/** Cotización pública Nasdaq; Yahoo sigue siendo el primer intento. */
export async function freeNasdaqQuote(
  symbol: string,
  assetClass: "stocks" | "etf" = detectAssetType(symbol) === "etf" ? "etf" : "stocks"
): Promise<Quote | null> {
  const sym = normalizeYahooSymbol(symbol);
  if (detectRegion(sym) !== "US" || isExcludedInstrument(sym)) return null;
  const data = await nasdaqJson(
    `https://api.nasdaq.com/api/quote/${encodeURIComponent(sym)}/summary?assetclass=${assetClass}`,
    600
  );
  const payload = record(record(data).data);
  if (!Object.keys(payload).length) return null;
  const summary = record(payload.summaryData);
  const value = (key: string): number | null => {
    const row = record(summary[key]);
    if (row.value == null) return null;
    const n = Number(String(row.value).replace(/[$,%\s,]/g, ""));
    return Number.isFinite(n) ? n : null;
  };
  const price = value("LastSalePrice") ?? value("LastPrice") ?? value("Last");
  if (price == null || price <= 0) return null;
  const previousClose = value("PreviousClose");
  const change = value("TodaysChange") ?? (previousClose != null ? price - previousClose : 0);
  const exchange =
    typeof payload.exchange === "string"
      ? payload.exchange
      : typeof payload.exchangeName === "string"
        ? payload.exchangeName
        : undefined;
  return {
    symbol: sym,
    name: typeof payload.companyName === "string" ? payload.companyName : sym,
    price,
    change,
    changePercent:
      value("TodaysChangePercent") ?? (previousClose ? (change / previousClose) * 100 : 0),
    previousClose: previousClose ?? price - change,
    volume: value("ShareVolume") ?? undefined,
    currency: "USD",
    region: "US",
    market: exchange || "US",
    ...(exchange ? { exchange } : {}),
    updatedAt: new Date().toISOString(),
    source: "nasdaq",
  };
}

function rowsOf(data: unknown): unknown[] {
  const payload = record(record(data).data);
  return Array.isArray(payload.rows) ? payload.rows : [];
}

/** Calendarios públicos Nasdaq: earnings, dividendos o IPOs. */
export async function freeNasdaqCalendar(
  from: string,
  to: string,
  type: "earnings" | "dividends" | "ipo"
) {
  const qs = `fromdate=${encodeURIComponent(from)}&todate=${encodeURIComponent(to)}&limit=5000`;
  const data = await nasdaqJson(`https://api.nasdaq.com/api/calendar/${type}?${qs}`, 1800);
  return rowsOf(data);
}

export async function freeNasdaqScreener(exchange = "nasdaq") {
  const data = await nasdaqJson(
    `https://api.nasdaq.com/api/screener/stocks?exchange=${encodeURIComponent(exchange)}&limit=5000`,
    3600
  );
  return rowsOf(data);
}

/** Búsqueda Yahoo solo de valores bursátiles; no muestra forex ni cripto. */
export async function freeYahooSearch(query: string): Promise<SearchResult[]> {
  const data = await yahooJson(
    `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0`,
    300
  );
  const quotes = array(record(data).quotes);
  return quotes.flatMap((value): SearchResult[] => {
    const quote = record(value);
    const originalSymbol = typeof quote.symbol === "string" ? quote.symbol : "";
    const quoteType = typeof quote.quoteType === "string" ? quote.quoteType : undefined;
    if (!originalSymbol || isExcludedInstrument(originalSymbol, quoteType)) return [];
    const symbol = normalizeYahooSymbol(originalSymbol);
    const region = detectRegion(symbol);
    return [{
      symbol,
      name:
        typeof quote.longname === "string"
          ? quote.longname
          : typeof quote.shortname === "string"
            ? quote.shortname
            : symbol,
      ...(typeof quote.exchange === "string" ? { exchange: quote.exchange } : {}),
      ...(quoteType ? { type: quoteType } : {}),
      region,
      currency: detectCurrency(symbol, region),
    }];
  });
}

/** Serie CSV pública de FRED (sin registro ni API key). */
export async function publicFredCsv(series = "DGS3MO", limit = 30) {
  const id = series.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{1,24}$/.test(id)) return null;
  try {
    const res = await fetch(
      `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(id)}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const lines = (await res.text()).trim().split(/\r?\n/).slice(1).filter(Boolean);
    const rows = lines
      .map((line) => {
        const [date, rawValue] = line.split(",");
        const n = Number(String(rawValue || "").replace(/^"|"$/g, ""));
        return { date: String(date || "").replace(/^"|"$/g, ""), value: Number.isFinite(n) ? n : null };
      })
      .filter((row) => row.date)
      .slice(-Math.max(1, Math.min(limit, 500)));
    return { series: id, rows, latest: [...rows].reverse().find((row) => row.value != null) || null, source: "fred" as const };
  } catch {
    return null;
  }
}

/** Deuda federal de EE.UU. vía Treasury Fiscal Data API pública. */
export async function publicTreasuryDebt() {
  try {
    const res = await fetch(
      "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?page%5Bsize%5D=5&sort=-record_date",
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const rows = array(record(data).data);
    return { data: rows, latest: rows[0] || null, source: "treasury-fiscal-data" };
  } catch {
    return null;
  }
}

const TRADINGVIEW_EXCHANGES: Record<string, string> = {
  ALTY: "NASDAQ",
  PFFD: "AMEX",
  SCHD: "AMEX",
  QYLD: "NASDAQ",
  SRET: "AMEX",
  SPYD: "AMEX",
  NOBL: "AMEX",
  SPHD: "AMEX",
  PFF: "AMEX",
  HDV: "AMEX",
  FDD: "AMEX",
  BP: "NYSE",
  PFE: "NYSE",
  MO: "NYSE",
  O: "NYSE",
  CAG: "NYSE",
  MPW: "NYSE",
  KMI: "NYSE",
  "PBR-A": "NYSE",
  VICI: "NYSE",
  SWK: "NYSE",
  BBD: "NYSE",
  VZ: "NYSE",
};

function tradingViewTicker(symbol: string): string {
  const sym = normalizeYahooSymbol(symbol);
  if (TRADINGVIEW_EXCHANGES[sym]) return `${TRADINGVIEW_EXCHANGES[sym]}:${sym}`;
  if (sym.endsWith(".MX")) return `BMV:${sym.replace(/\.MX$/, "")}`;
  if (sym.endsWith(".MC")) return `BME:${sym.replace(/\.MC$/, "")}`;
  if (sym.endsWith(".L")) return `LSE:${sym.replace(/\.L$/, "")}`;
  if (sym.endsWith(".DE")) return `XETR:${sym.replace(/\.DE$/, "")}`;
  if (sym.endsWith(".PA")) return `EURONEXT:${sym.replace(/\.PA$/, "")}`;
  return `NASDAQ:${sym}`;
}

type TradingViewArea = "america" | "europe" | "mexico";

function tradingViewArea(symbol: string): TradingViewArea {
  const region = detectRegion(symbol);
  return region === "MX" ? "mexico" : region === "GLOBAL" ? "europe" : "america";
}

async function queryTradingViewArea(
  area: TradingViewArea,
  symbols: string[]
): Promise<PublicTradingViewQuote[]> {
  if (!symbols.length) return [];
  try {
    const res = await fetch(`https://scanner.tradingview.com/${area}/scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; MX Cartera Global/1.0)",
      },
      body: JSON.stringify({
        filter: [],
        options: { lang: "en" },
        symbols: { query: { types: [] }, tickers: symbols.map(tradingViewTicker) },
        columns: ["name", "close", "change", "change_abs", "volume", "currency", "market_cap_basic"],
        sort: { sortBy: "market_cap_basic", sortOrder: "desc" },
        range: [0, symbols.length],
      }),
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const response: unknown = await res.json();
    const rows = array(record(response).data);
    return rows.flatMap((value): PublicTradingViewQuote[] => {
      const row = record(value);
      const ticker = String(row.s || "").split(":").pop() || "";
      const symbol = normalizeYahooSymbol(ticker);
      const requestedSymbol = symbols.find((candidate) => candidate === symbol);
      const fields = array(row.d);
      const price = Number(fields[1]);
      const changePercent = Number(fields[2]);
      const change = Number(fields[3]);
      if (!requestedSymbol || !Number.isFinite(price) || price <= 0) return [];
      const region = detectRegion(requestedSymbol);
      const currency = typeof fields[5] === "string" ? fields[5] : detectCurrency(requestedSymbol, region);
      const market = String(row.s || "").split(":")[0] || "TradingView";
      return [{
        symbol: requestedSymbol,
        name: typeof fields[0] === "string" ? fields[0] : requestedSymbol,
        price,
        change: Number.isFinite(change) ? change : 0,
        changePercent: Number.isFinite(changePercent) ? changePercent : 0,
        volume: Number.isFinite(Number(fields[4])) ? Number(fields[4]) : undefined,
        marketCap: Number.isFinite(Number(fields[6])) ? Number(fields[6]) : undefined,
        currency,
        region,
        market,
        exchange: market,
        updatedAt: new Date().toISOString(),
        source: "tradingview",
      }];
    });
  } catch {
    return [];
  }
}

/**
 * TradingView Scanner público/no oficial. Se agrupa por mercado y se usa solo
 * como respaldo: su formato y disponibilidad pueden cambiar sin aviso.
 */
export async function publicTradingViewScan(symbols: string[]): Promise<PublicTradingViewQuote[]> {
  const unique = [...new Set(symbols.map(normalizeYahooSymbol))]
    .filter((symbol) => symbol && !isExcludedInstrument(symbol))
    .slice(0, 100);
  if (!unique.length) return [];

  const groups = new Map<TradingViewArea, string[]>();
  for (const symbol of unique) {
    const area = tradingViewArea(symbol);
    groups.set(area, [...(groups.get(area) || []), symbol]);
  }
  const results = await Promise.all(
    [...groups].map(([area, groupedSymbols]) => queryTradingViewArea(area, groupedSymbols))
  );
  return results.flat();
}

export async function freeTradingViewQuote(symbol: string): Promise<Quote | null> {
  const canonical = normalizeYahooSymbol(symbol);
  const rows = await publicTradingViewScan([canonical]);
  return rows.find((row) => row.symbol === canonical) || null;
}

/** SEC EDGAR public filings; SEC asks clients to identify themselves by User-Agent. */
export async function publicSecRecentIpos(from: string, to: string) {
  try {
    const url = `https://efts.sec.gov/LATEST/search-index?q=S-1&forms=S-1%2CS-1%2FA%2C424B4&startdt=${encodeURIComponent(from)}&enddt=${encodeURIComponent(to)}&from=0&size=100`;
    const data = await secJson(url, 1800);
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

function secTickerKey(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function secTickerMap(data: unknown): Array<{ cik: number; ticker: string; title: string }> {
  const values = isRecord(data) ? Object.values(data) : array(data);
  return values.flatMap((value) => {
    const row = record(value);
    const cik = Number(row.cik_str ?? row.cik);
    const ticker = typeof row.ticker === "string" ? row.ticker : "";
    const title = typeof row.title === "string" ? row.title : "";
    return Number.isFinite(cik) && ticker ? [{ cik, ticker, title }] : [];
  });
}

type SecObservation = {
  end?: string;
  start?: string;
  fy?: number;
  form?: string;
  filed?: string;
  val?: number;
  fp?: string;
};

function annualFacts(
  usGaap: JsonRecord,
  candidateTags: string[],
  preferredUnit = "USD",
  duration = false
): Map<number, { value: number; filedAt?: string }> {
  for (const tag of candidateTags) {
    const units = record(record(usGaap[tag]).units);
    const observations = array(units[preferredUnit]) as SecObservation[];
    if (!observations.length) continue;
    const byYear = new Map<number, { value: number; filedAt?: string }>();
    for (const obs of observations) {
      if (!obs || !obs.end || !Number.isFinite(Number(obs.val))) continue;
      if (!(["10-K", "10-K/A", "20-F", "20-F/A"].includes(String(obs.form)))) continue;
      if (duration && obs.start) {
        const span = (Date.parse(obs.end) - Date.parse(obs.start)) / 86_400_000;
        if (!Number.isFinite(span) || span < 300 || span > 400) continue;
      }
      if (duration && obs.fp && obs.fp !== "FY") continue;
      const year = Number(obs.fy) || Number(obs.end.slice(0, 4));
      if (!Number.isFinite(year)) continue;
      const current = byYear.get(year);
      if (!current || String(obs.filed || "") > String(current.filedAt || "")) {
        byYear.set(year, { value: Number(obs.val), filedAt: obs.filed });
      }
    }
    if (byYear.size) return byYear;
  }
  return new Map();
}

/**
 * SEC CompanyFacts para emisoras con filing en EE.UU. No aplica a ETFs ni a
 * emisoras que no reportan en XBRL de SEC. Se cachea en el edge de Next.
 */
export async function publicSecCompanyFacts(symbol: string): Promise<PublicSecCompanyFacts | null> {
  const sym = normalizeYahooSymbol(symbol);
  if (isExcludedInstrument(sym) || detectAssetType(sym) === "etf") return null;

  const tickerData = await secJson("https://www.sec.gov/files/company_tickers.json", 86_400);
  const candidates = secTickerMap(tickerData);
  const wanted = secTickerKey(sym);
  const company = candidates.find((candidate) => secTickerKey(candidate.ticker) === wanted);
  if (!company) return null;

  const cik = String(company.cik).padStart(10, "0");
  const factsUrl = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
  const submissionsUrl = `https://data.sec.gov/submissions/CIK${cik}.json`;
  const [factsData, submissionsData] = await Promise.all([
    secJson(factsUrl, 86_400),
    secJson(submissionsUrl, 86_400),
  ]);
  if (!factsData) return null;

  const facts = record(record(factsData).facts);
  const usGaap = record(facts["us-gaap"]);
  const revenue = annualFacts(
    usGaap,
    [
      "RevenueFromContractWithCustomerExcludingAssessedTax",
      "RevenueFromContractWithCustomerIncludingAssessedTax",
      "Revenues",
      "SalesRevenueNet",
    ],
    "USD",
    true
  );
  const netIncome = annualFacts(usGaap, ["NetIncomeLoss", "ProfitLoss"], "USD", true);
  const assets = annualFacts(usGaap, ["Assets"], "USD");
  const equity = annualFacts(
    usGaap,
    ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"],
    "USD"
  );
  const liabilities = annualFacts(usGaap, ["Liabilities"], "USD");
  const years = [...new Set([
    ...revenue.keys(),
    ...netIncome.keys(),
    ...assets.keys(),
    ...equity.keys(),
    ...liabilities.keys(),
  ])].sort((a, b) => a - b).slice(-6);
  const financials = years.map((year) => ({
    year,
    revenue: revenue.get(year)?.value ?? null,
    netIncome: netIncome.get(year)?.value ?? null,
    assets: assets.get(year)?.value ?? null,
    equity: equity.get(year)?.value ?? null,
    liabilities: liabilities.get(year)?.value ?? null,
    filedAt:
      revenue.get(year)?.filedAt || netIncome.get(year)?.filedAt || assets.get(year)?.filedAt,
  }));

  const recent = record(record(record(submissionsData).filings).recent);
  const forms = array(recent.form).map(String);
  const dates = array(recent.filingDate).map(String);
  const accessions = array(recent.accessionNumber).map(String);
  const documents = array(recent.primaryDocument).map(String);
  const filings = forms.flatMap((form, index) => {
    if (!["10-K", "10-Q", "20-F", "6-K", "8-K"].includes(form)) return [];
    const date = dates[index] || "";
    const accession = accessions[index] || "";
    if (!date || !accession) return [];
    return [{ date, form, accession, document: documents[index] || undefined }];
  }).slice(0, 12);

  if (!financials.length && !filings.length) return null;
  return {
    symbol: sym,
    cik,
    name: company.title,
    source: "sec-edgar",
    financials,
    filings,
  };
}
