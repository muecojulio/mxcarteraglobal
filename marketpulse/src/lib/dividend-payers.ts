export type MxDiv = { symbol: string; name: string; kind: "stock" | "etf" | "fibra"; venue: string };
export const DIV_MX_STOCKS: MxDiv[] = [
  { symbol: "GFNORTEO.MX", name: "Banorte", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "AMXL.MX", name: "América Móvil", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "WALMEX.MX", name: "Walmart México", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "FEMSAUBD.MX", name: "FEMSA", kind: "stock", venue: "BMV/BIVA" },
];
export const DIV_SIC_STOCKS: MxDiv[] = [
  { symbol: "AAPL", name: "Apple", kind: "stock", venue: "SIC" },
  { symbol: "MSFT", name: "Microsoft", kind: "stock", venue: "SIC" },
  { symbol: "JNJ", name: "J&J", kind: "stock", venue: "SIC" },
  { symbol: "KO", name: "Coca-Cola", kind: "stock", venue: "SIC" },
];
export const DIV_ETFS: MxDiv[] = [{ symbol: "SCHD", name: "Schwab US Dividend", kind: "etf", venue: "SIC" }];
export function paysDividend(symbol: string): boolean {
  const s = symbol.toUpperCase();
  return [...DIV_MX_STOCKS, ...DIV_SIC_STOCKS, ...DIV_ETFS].some((i) => i.symbol === s);
}
