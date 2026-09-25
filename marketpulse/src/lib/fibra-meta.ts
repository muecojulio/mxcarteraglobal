export const FIBRA_TICKERS = ["FUNO11", "FIBRAPL14", "DANHOS13", "TERRA13", "FMTY14"];
export function isFibra(symbol: string): boolean {
  const s = symbol.toUpperCase().replace(/\.MX$/, "");
  return s.startsWith("FIBRA") || FIBRA_TICKERS.some((t) => s.startsWith(t.replace(/\d+$/, "")));
}
