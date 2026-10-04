export type Region = "MX" | "US" | "GLOBAL";
export interface Quote {
  symbol: string; name: string; price: number; change: number; changePercent: number;
  previousClose?: number; open?: number; high?: number; low?: number; volume?: number; marketCap?: number;
  currency: string; region: Region; market?: string; exchange?: string; updatedAt: string; source: string;
}
export interface SearchResult { symbol: string; name: string; exchange?: string; type?: string; region?: Region; currency?: string; }
export interface IndexQuote { symbol: string; name: string; price: number; changePercent: number; region: Region; updatedAt: string; source: string; }
export interface DividendRecord {
  date: string;
  amount: number;
  currency?: string;
  exDate?: string;
  paymentDate?: string;
  recordDate?: string;
  declarationDate?: string;
  frequency?: string;
  type?: string;
}
export interface MarketDataProvider {
  name: string;
  getQuote(symbol: string): Promise<Quote | null>;
  getQuotes(symbols: string[]): Promise<Quote[]>;
  search(query: string): Promise<SearchResult[]>;
  getIndices?(): Promise<IndexQuote[]>;
  getDividends?(symbol: string): Promise<DividendRecord[]>;
}
export function detectRegion(symbol: string): Region {
  const s = symbol.toUpperCase();
  if (s.endsWith(".MX") || s.endsWith(".MXN") || s === "KOFUBL") return "MX";
  if (s === "IBE N" || s === "IBE.MC" || s.endsWith(".L") || s.endsWith(".PA") || s.endsWith(".DE") || s.endsWith(".T") || s.endsWith(".HK") || s.endsWith(".SS") || s.endsWith(".SZ")) return "GLOBAL";
  return "US";
}
export function detectCurrency(symbol: string, region?: Region): string {
  const r = region ?? detectRegion(symbol);
  if (r === "MX") return "MXN";
  return "USD";
}
export type AssetType = "stock" | "etf" | "fibra" | "other";
const FIBRA_BASES = new Set(["FUNO11","FIBRAPL14","FIBRAPL","DANHOS13","DANHOS","TERRA13","FSHOP13","FIHO12","FHIPO14","FNOVA17","FMTY14","FMTY","EDUCA18","STORAGE18","FNOVA","FIBRAUP","FIBRAUP15","FIBRAINN","FINN13","FPLUS16","FPLUS","FINN","FCFE18","FCFE","FMX23","NEXT25","NEXT"]);
const US_ETF = new Set(["ALTY","PFFD","SRET","SRET1","SPYD","SPHD","PFF","HDV","FDD","SPY","QQQ","VOO","VTI","IWM","DIA","SCHD","VIG","VYM","JEPI","JEPQ","QYLD","XYLD","DVY","SDY","NOBL","VNQ","SCHH","XLK","XLF","XLE","XLV","XLI","XLP","XLY","XLU","XLB","XLRE","ARKK","GLD","SLV","TLT","HYG","LQD","EFA","EEM","IEMG","VXUS","BND"]);
export const YAHOO_SYMBOL_ALIASES: Record<string, string> = { SRET1: "SRET", "BP N": "BP", "PBRA N": "PBR-A", "PBR A": "PBR-A", "IBE N": "IBE.MC", "BBD N": "BBD", KOFUBL: "KOFUBL.MX" };
export function normalizeYahooSymbol(symbol: string): string {
  const clean = symbol.trim().toUpperCase();
  return YAHOO_SYMBOL_ALIASES[clean] || clean;
}
export function detectAssetType(symbol: string): AssetType {
  const s = symbol.toUpperCase().replace(/\.MXN$/, ".MX");
  const base = s.replace(/\.MX$/, "").replace(/\*$/, "");
  if (FIBRA_BASES.has(base) || base.startsWith("FIBRA") || /^(FUNO|DANHOS|TERRA|FSHOP|FIHO|FHIPO|FNOVA|FMTY|EDUCA|STORAGE|FINN|FPLUS|FCFE|FMX23|NEXT)\d*/.test(base)) return "fibra";
  if (US_ETF.has(base) || US_ETF.has(s)) return "etf";
  return "stock";
}
