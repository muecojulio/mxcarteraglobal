export type Stock = { symbol: string; name: string; price: number; change: number; changePercent: number; region: "MX" | "US" | "GLOBAL"; market: string; currency: string };
export const mockIndices = [
  { name: "S&P 500", symbol: "SPX", price: 5432.1, changePercent: 0.85, region: "US" as const },
  { name: "Nasdaq", symbol: "NDX", price: 17890.45, changePercent: 1.12, region: "US" as const },
  { name: "IPC México", symbol: "MXX", price: 54210.3, changePercent: -0.42, region: "MX" as const },
  { name: "Dow Jones", symbol: "DJI", price: 39875.2, changePercent: 0.31, region: "US" as const },
];
export const mockStocks: Stock[] = [
  { symbol: "AAPL", name: "Apple Inc.", price: 214.5, change: 3.82, changePercent: 1.81, region: "US", market: "NASDAQ", currency: "USD" },
  { symbol: "AMXL.MX", name: "América Móvil", price: 15.82, change: -0.1, changePercent: -0.63, region: "MX", market: "BMV", currency: "MXN" },
  { symbol: "MSFT", name: "Microsoft Corp.", price: 428.3, change: 3.85, changePercent: 0.91, region: "US", market: "NASDAQ", currency: "USD" },
  { symbol: "WALMEX.MX", name: "Walmart de México", price: 62.15, change: 0.25, changePercent: 0.4, region: "MX", market: "BMV", currency: "MXN" },
  { symbol: "NVDA", name: "NVIDIA Corp.", price: 118.75, change: 4.2, changePercent: 3.66, region: "US", market: "NASDAQ", currency: "USD" },
  { symbol: "GFNORTEO.MX", name: "Grupo Financiero Banorte", price: 148.9, change: -1.35, changePercent: -0.9, region: "MX", market: "BMV", currency: "MXN" },
  { symbol: "TSLA", name: "Tesla Inc.", price: 248.6, change: -5.4, changePercent: -2.13, region: "US", market: "NASDAQ", currency: "USD" },
  { symbol: "FEMSAUBD.MX", name: "Fomento Económico Mexicano", price: 195.4, change: 1.1, changePercent: 0.57, region: "MX", market: "BMV", currency: "MXN" },
];
