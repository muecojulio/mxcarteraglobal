import { detectRegion, detectCurrency, normalizeYahooSymbol } from "./market-data/types";
const Y_HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; MX Cartera Global/1.0)", Accept: "application/json,text/plain,*/*" };
const N_HEADERS = { ...Y_HEADERS, Referer: "https://www.nasdaq.com/", "Accept-Language": "en-US,en;q=0.9" };
export type FreeQuoteSummary = { price: number | null; marketCap: number | null; pe: number | null; peg: number | null; pb: number | null; ps: number | null; roe: number | null; roa: number | null; roi: number | null; revGrowth: number | null; epsGrowth: number | null; debtEquity: number | null; currentRatio: number | null; divYield: number | null; expenseRatio: number | null; high52: number | null; low52: number | null; avgVolume: number | null };
function raw(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "object" && v !== null && "raw" in v) { const n = Number((v as { raw?: unknown }).raw); return Number.isFinite(n) ? n : null; }
  const n = Number(v); return Number.isFinite(n) ? n : null;
}
function pct(v: unknown): number | null { const n = raw(v); if (n == null) return null; return Math.abs(n) <= 2 ? n * 100 : n; }
async function yahooJson(url: string, revalidate = 300): Promise<any | null> {
  try { const res = await fetch(url, { headers: Y_HEADERS, next: { revalidate } }); if (!res.ok) return null; return await res.json(); } catch { return null; }
}
async function nasdaqJson(url: string, revalidate = 900): Promise<any | null> {
  try { const res = await fetch(url, { headers: N_HEADERS, next: { revalidate } }); if (!res.ok) return null; return await res.json(); } catch { return null; }
}
export async function freeYahooSummary(symbol: string): Promise<FreeQuoteSummary> {
  const sym = normalizeYahooSymbol(symbol);
  const [chart, summary] = await Promise.all([
    yahooJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`, 300),
    yahooJson(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=price,summaryDetail,defaultKeyStatistics,financialData,fundProfile`, 21600),
  ]);
  const meta = chart?.chart?.result?.[0]?.meta || {};
  const r = summary?.quoteSummary?.result?.[0] || {};
  const price = r.price || {}; const sd = r.summaryDetail || {}; const ks = r.defaultKeyStatistics || {}; const fd = r.financialData || {};
  let expenseRatio = raw(ks.annualReportExpenseRatio ?? ks.expenseRatio);
  if (expenseRatio != null && expenseRatio < 1) expenseRatio *= 100;
  return { price: raw(meta.regularMarketPrice) ?? raw(price.regularMarketPrice), marketCap: raw(price.marketCap) ?? raw(sd.marketCap), pe: raw(sd.trailingPE) ?? raw(ks.trailingPE), peg: raw(ks.pegRatio), pb: raw(sd.priceToBook) ?? raw(ks.priceToBook), ps: raw(sd.priceToSalesTrailing12Months), roe: pct(fd.returnOnEquity), roa: pct(fd.returnOnAssets), roi: pct(fd.returnOnInvestment), revGrowth: pct(fd.revenueGrowth), epsGrowth: pct(fd.earningsGrowth), debtEquity: raw(fd.debtToEquity), currentRatio: raw(fd.currentRatio), divYield: pct(sd.dividendYield ?? sd.yield), expenseRatio, high52: raw(sd.fiftyTwoWeekHigh), low52: raw(sd.fiftyTwoWeekLow), avgVolume: raw(sd.averageVolume) };
}
export async function freeYahooDividends(symbol: string, range = "10y") {
  const sym = normalizeYahooSymbol(symbol);
  const data = await yahooJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=${range}&events=div%2Csplit`, 3600);
  const result = data?.chart?.result?.[0]; const divs = result?.events?.dividends;
  if (!divs || typeof divs !== "object") return [];
  const isMx = sym.endsWith(".MX") || detectRegion(sym) === "MX";
  const currency = result?.meta?.currency === "MXN" || isMx ? "MXN" : "USD";
  return Object.values(divs as Record<string, { amount?: number; date?: number }>).filter((d) => d?.amount != null && d?.date != null).map((d) => ({ date: new Date(Number(d.date) * 1000).toISOString().slice(0, 10), amount: Number(d.amount), currency })).sort((a, b) => b.date.localeCompare(a.date));
}
export async function freeNasdaqQuote(symbol: string, assetClass: "stocks" | "etf" = "stocks") {
  const sym = symbol.trim().toUpperCase();
  const data = await nasdaqJson(`https://api.nasdaq.com/api/quote/${encodeURIComponent(sym)}/summary?assetclass=${assetClass}`, 600);
  const d = data?.data; if (!d) return null;
  const summary = d.summaryData || {};
  const value = (key: string) => { const v = summary[key]?.value; if (v == null) return null; const n = Number(String(v).replace(/[$,% ,]/g, "")); return Number.isFinite(n) ? n : null; };
  const price = value("LastSalePrice") ?? value("LastPrice") ?? value("Last"); if (price == null) return null;
  const prev = value("PreviousClose"); const change = value("TodaysChange") ?? (prev != null ? price - prev : 0);
  return { symbol: sym, name: d.companyName || sym, price, change, changePercent: value("TodaysChangePercent") ?? (prev ? (change / prev) * 100 : 0), previousClose: prev ?? price - change, volume: value("ShareVolume"), currency: "USD", region: "US" as const, market: "NASDAQ", exchange: "NASDAQ", updatedAt: new Date().toISOString(), source: "nasdaq" };
}
function rowsOf(data: any): any[] { return Array.isArray(data?.data?.rows) ? data.data.rows : []; }
export async function freeNasdaqCalendar(from: string, to: string, type: "earnings" | "dividends" | "ipo") {
  const qs = `fromdate=${encodeURIComponent(from)}&todate=${encodeURIComponent(to)}&limit=5000`;
  const data = await nasdaqJson(`https://api.nasdaq.com/api/calendar/${type}?${qs}`, 1800);
  return rowsOf(data);
}
export async function freeNasdaqScreener(exchange = "nasdaq") {
  const data = await nasdaqJson(`https://api.nasdaq.com/api/screener/stocks?exchange=${encodeURIComponent(exchange)}&limit=5000`, 3600);
  return rowsOf(data);
}
export async function freeYahooSearch(query: string) {
  const data = await yahooJson(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0`, 300);
  const quotes = Array.isArray(data?.quotes) ? data.quotes : [];
  return quotes.filter((q: any) => q.symbol && !String(q.quoteType || "").toLowerCase().includes("crypto")).map((q: any) => { const region = detectRegion(String(q.symbol)); return { symbol: String(q.symbol), name: q.longname || q.shortname || String(q.symbol), exchange: q.exchange, type: q.quoteType, region, currency: detectCurrency(String(q.symbol), region) }; });
}
export async function publicFredCsv(series = "DGS10") {
  try { const res = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(series)}`, { next: { revalidate: 3600 } }); if (!res.ok) return null; const lines = (await res.text()).trim().split(/\r?\n/).slice(1).filter(Boolean); return { series, rows: lines.map((line) => { const [date, value] = line.split(","); const n = Number(value); return { date, value: Number.isFinite(n) ? n : null }; }).filter((r) => r.date) }; } catch { return null; }
}
export async function publicTreasuryDebt() {
  try { const res = await fetch("https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?page%5Bsize%5D=5&sort=-record_date", { next: { revalidate: 3600 } }); if (!res.ok) return null; const data = await res.json(); return { data: Array.isArray(data?.data) ? data.data : [], source: "treasury-fiscal-data" }; } catch { return null; }
}
export async function publicTradingViewScan(symbols: string[]) {
  try {
    const res = await fetch("https://scanner.tradingview.com/america/scan", { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (compatible; MX Cartera Global/1.0)" }, body: JSON.stringify({ filter: [], options: { lang: "en" }, symbols: { query: { types: [] }, tickers: symbols.map((s) => `NASDAQ:${normalizeYahooSymbol(s)}`) }, columns: ["name", "close", "change", "volume"], sort: { sortBy: "market_cap_basic", sortOrder: "desc" }, range: [0, Math.min(symbols.length, 100)] }), next: { revalidate: 300 } });
    if (!res.ok) return []; const data = await res.json(); return Array.isArray(data?.data) ? data.data : [];
  } catch { return []; }
}
export async function publicSecRecentIpos(from: string, to: string) {
  try {
    const res = await fetch(`https://efts.sec.gov/LATEST/search-index?q=S-1&forms=S-1%2CS-1%2FA%2C424B4&startdt=${encodeURIComponent(from)}&enddt=${encodeURIComponent(to)}&from=0&size=100`, { headers: { "User-Agent": process.env.SEC_USER_AGENT?.trim() || "MX Cartera Global/1.0 contacto-webmaster@example.com", Accept: "application/json" }, next: { revalidate: 1800 } });
    if (!res.ok) return []; const d = await res.json(); const hits = Array.isArray(d?.hits?.hits) ? d.hits.hits : [];
    return hits.map((h: any) => { const src = h?._source || {}; return { date: String(src.filedAt || src.filingDate || "").slice(0, 10), symbol: Array.isArray(src.tickers) ? src.tickers.join(", ") : String(src.tickers || ""), name: String(src.display_names || src.entityName || "SEC filing"), form: String(src.form || "S-1"), source: "sec-edgar" }; }).filter((x: any) => x.date);
  } catch { return []; }
}
