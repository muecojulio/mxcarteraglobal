export type SicKind = "stock" | "etf";
export type SicItem = { symbol: string; name: string; kind: SicKind; region: "US" | "EU" | "ASIA" | "LATAM" | "GLOBAL" };
export const SIC_CATALOG: SicItem[] = [
  { symbol: "AAPL", name: "Apple Inc.", kind: "stock", region: "US" },
  { symbol: "MSFT", name: "Microsoft Corp.", kind: "stock", region: "US" },
  { symbol: "NVDA", name: "NVIDIA Corp.", kind: "stock", region: "US" },
  { symbol: "SPY", name: "SPDR S&P 500", kind: "etf", region: "US" },
];
export function isSicSymbol(symbol: string): boolean {
  const s = symbol.toUpperCase().replace(/\.MX$/, "");
  return SIC_CATALOG.some((i) => i.symbol === s);
}
