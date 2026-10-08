/** Tipos compartidos y normalización de símbolos para datos bursátiles. */

export type Region = "MX" | "US" | "GLOBAL";

export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  marketCap?: number;
  currency: string;
  region: Region;
  market?: string;
  exchange?: string;
  updatedAt: string;
  source: string;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange?: string;
  type?: string;
  region?: Region;
  currency?: string;
}

export interface IndexQuote {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  region: Region;
  updatedAt: string;
  source: string;
}

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

/**
 * Alias frecuentes de casas de bolsa / SIC al símbolo que entiende Yahoo.
 * Se admiten espacios tanto como "BP N" como ya compactados ("BPN").
 */
export const YAHOO_SYMBOL_ALIASES: Record<string, string> = {
  SRET1: "SRET",
  "BP N": "BP",
  BPN: "BP",
  "PBRA N": "PBR-A",
  PBRAN: "PBR-A",
  "PBR A": "PBR-A",
  PBRA: "PBR-A",
  "IBE N": "IBE.MC",
  IBEN: "IBE.MC",
  IBE: "IBE.MC",
  "BBD N": "BBD",
  BBDN: "BBD",
  KOFUBL: "KOFUBL.MX",
};

/** Convierte ticker de pantalla a ticker canónico, sin cambiar los demás símbolos. */
export function normalizeYahooSymbol(symbol: string): string {
  const spaced = symbol.trim().toUpperCase().replace(/\s+/g, " ");
  const compact = spaced.replace(/\s/g, "");
  return YAHOO_SYMBOL_ALIASES[spaced] || YAHOO_SYMBOL_ALIASES[compact] || compact;
}

const GLOBAL_SUFFIXES = [
  ".L", ".PA", ".DE", ".T", ".HK", ".SS", ".SZ", ".MC", ".AS", ".TO",
  ".SW", ".MI", ".BR", ".AX", ".NZ", ".KS", ".KQ", ".SA", ".SI",
];

export function detectRegion(symbol: string): Region {
  const s = normalizeYahooSymbol(symbol);
  if (s.endsWith(".MX") || s.endsWith(".MXN") || s === "KOFUBL") return "MX";
  if (GLOBAL_SUFFIXES.some((suffix) => s.endsWith(suffix))) return "GLOBAL";
  // BP, BBD and PBR-A are US-listed ADRs; IBE is normalized to IBE.MC above.
  return "US";
}

export function detectCurrency(symbol: string, region?: Region): string {
  const s = normalizeYahooSymbol(symbol);
  if (s.endsWith(".MX") || s.endsWith(".MXN") || s === "KOFUBL.MX") return "MXN";
  if (s.endsWith(".L")) return "GBP";
  if ([".PA", ".DE", ".MC", ".AS", ".BR", ".MI"].some((suffix) => s.endsWith(suffix))) return "EUR";
  if (s.endsWith(".T")) return "JPY";
  if (s.endsWith(".HK")) return "HKD";
  if (s.endsWith(".SS") || s.endsWith(".SZ")) return "CNY";
  if (s.endsWith(".TO")) return "CAD";
  if (s.endsWith(".AX")) return "AUD";
  if (s.endsWith(".NZ")) return "NZD";
  if (s.endsWith(".SW")) return "CHF";
  if (s.endsWith(".KS") || s.endsWith(".KQ")) return "KRW";
  if (s.endsWith(".SA")) return "BRL";
  return region === "MX" ? "MXN" : "USD";
}

/**
 * Los endpoints de acciones no deben devolver pares FX ni criptoactivos.
 * La conversión de divisas interna de la app (fx) es una funcionalidad aparte.
 */
const CRYPTO_BASES = new Set([
  "BTC", "ETH", "SOL", "XRP", "DOGE", "ADA", "BNB", "AVAX", "DOT", "LTC",
  "BCH", "LINK", "SHIB", "TRX", "TON", "XLM", "ATOM", "ETC", "NEAR", "SUI",
]);
const FIAT_CODES = new Set([
  "USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD", "MXN", "CNY", "HKD",
]);
const CRYPTO_QUOTES = new Set([...FIAT_CODES, "USDT", "USDC", "BUSD", "DAI", "TUSD", "FDUSD"]);

export function isExcludedInstrument(symbol: string, quoteType?: string): boolean {
  if (quoteType && /(crypto|cryptocurrency|currency|forex|foreign exchange|\bfx\b)/i.test(quoteType)) {
    return true;
  }
  const s = normalizeYahooSymbol(symbol);
  if (/^[A-Z]{3,6}=X$/.test(s)) return true;
  const compactFiatPair = s.match(/^([A-Z]{3})(USD|EUR|GBP|JPY|CHF|CAD|AUD|NZD|MXN|CNY|HKD)$/);
  if (compactFiatPair && FIAT_CODES.has(compactFiatPair[1]) && FIAT_CODES.has(compactFiatPair[2])) return true;
  const cryptoPair = s.match(/^([A-Z0-9]{2,12})(USD|EUR|GBP|JPY|CHF|CAD|AUD|NZD|MXN|CNY|HKD|USDT|USDC|BUSD|DAI|TUSD|FDUSD)$/);
  if (cryptoPair && CRYPTO_BASES.has(cryptoPair[1]) && CRYPTO_QUOTES.has(cryptoPair[2])) return true;
  const pair = s.match(/^([A-Z0-9]{2,12})[-/]([A-Z]{3,5})$/);
  if (pair && CRYPTO_QUOTES.has(pair[2]) && CRYPTO_BASES.has(pair[1])) return true;
  const fiatPair = s.match(/^([A-Z]{3})[-/]([A-Z]{3})$/);
  if (fiatPair && FIAT_CODES.has(fiatPair[1]) && FIAT_CODES.has(fiatPair[2])) return true;
  return false;
}

export type AssetType = "stock" | "etf" | "fibra" | "other";

const FIBRA_BASES = new Set([
  "FUNO11", "FIBRAPL14", "FIBRAPL", "DANHOS13", "DANHOS", "TERRA13",
  "FSHOP13", "FIHO12", "FHIPO14", "FNOVA17", "FMTY14", "FMTY", "EDUCA18",
  "STORAGE18", "FNOVA", "FIBRAUP", "FIBRAUP15", "FIBRAINN", "FINN13",
  "FPLUS16", "FPLUS", "FINN", "FCFE18", "FCFE", "FMX23", "NEXT25", "NEXT",
]);

const US_ETF = new Set([
  "ALTY", "PFFD", "SCHD", "QYLD", "SRET", "SRET1", "SPYD", "NOBL", "SPHD",
  "PFF", "HDV", "FDD", "SPY", "QQQ", "VOO", "VTI", "IWM", "DIA", "VIG",
  "VYM", "JEPI", "JEPQ", "XYLD", "DVY", "SDY", "VNQ", "SCHH", "XLK", "XLF",
  "XLE", "XLV", "XLI", "XLP", "XLY", "XLU", "XLB", "XLRE", "ARKK", "GLD",
  "SLV", "TLT", "HYG", "LQD", "EFA", "EEM", "IEMG", "VXUS", "BND",
]);

export function detectAssetType(symbol: string): AssetType {
  const s = normalizeYahooSymbol(symbol).replace(/\.MXN$/, ".MX");
  const base = s.replace(/\.MX$/, "").replace(/\*$/, "");

  if (
    FIBRA_BASES.has(base) ||
    base.startsWith("FIBRA") ||
    /^(FUNO|DANHOS|TERRA|FSHOP|FIHO|FHIPO|FNOVA|FMTY|EDUCA|STORAGE|FINN|FPLUS|FCFE|FMX23|NEXT)\d*/.test(base)
  ) {
    return "fibra";
  }
  if (US_ETF.has(base) || US_ETF.has(s)) return "etf";
  return "stock";
}
