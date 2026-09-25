export type DividendEvent = { symbol: string; name: string; region: "MX" | "US"; exDate: string; payDate: string; amount: number; currency: "USD" | "MXN"; frequency: "trimestral" | "mensual" | "anual" | "semestral"; yieldApprox?: number };
export type DividendStock = { symbol: string; name: string; region: "MX" | "US"; currency: "USD" | "MXN"; frequency: string; annualDividend: number; yieldApprox: number; lastAmount: number; nextExDate?: string; nextPayDate?: string };
export const dividendStocks: DividendStock[] = [
  { symbol: "AAPL", name: "Apple Inc.", region: "US", currency: "USD", frequency: "trimestral", annualDividend: 1, yieldApprox: 0.5, lastAmount: 0.25 },
  { symbol: "MSFT", name: "Microsoft Corp.", region: "US", currency: "USD", frequency: "trimestral", annualDividend: 3.32, yieldApprox: 0.8, lastAmount: 0.83 },
  { symbol: "JNJ", name: "Johnson & Johnson", region: "US", currency: "USD", frequency: "trimestral", annualDividend: 4.96, yieldApprox: 3.1, lastAmount: 1.24 },
  { symbol: "KO", name: "Coca-Cola", region: "US", currency: "USD", frequency: "trimestral", annualDividend: 1.94, yieldApprox: 3.0, lastAmount: 0.485 },
  { symbol: "O", name: "Realty Income", region: "US", currency: "USD", frequency: "mensual", annualDividend: 3.17, yieldApprox: 5.5, lastAmount: 0.264 },
  { symbol: "SCHD", name: "Schwab US Dividend Equity ETF", region: "US", currency: "USD", frequency: "trimestral", annualDividend: 2.5, yieldApprox: 3.5, lastAmount: 0.62 },
  { symbol: "PG", name: "Procter & Gamble", region: "US", currency: "USD", frequency: "trimestral", annualDividend: 4.03, yieldApprox: 2.4, lastAmount: 1.0068 },
  { symbol: "AMXL.MX", name: "América Móvil", region: "MX", currency: "MXN", frequency: "anual", annualDividend: 0.46, yieldApprox: 2.8, lastAmount: 0.46 },
  { symbol: "WALMEX.MX", name: "Walmart de México", region: "MX", currency: "MXN", frequency: "anual", annualDividend: 1.1, yieldApprox: 1.8, lastAmount: 1.1 },
  { symbol: "GFNORTEO.MX", name: "Banorte", region: "MX", currency: "MXN", frequency: "anual", annualDividend: 18, yieldApprox: 12, lastAmount: 18 },
  { symbol: "FEMSAUBD.MX", name: "FEMSA", region: "MX", currency: "MXN", frequency: "anual", annualDividend: 4.3, yieldApprox: 2.2, lastAmount: 4.3 },
  { symbol: "BIMBOA.MX", name: "Grupo Bimbo", region: "MX", currency: "MXN", frequency: "anual", annualDividend: 1.4, yieldApprox: 2.0, lastAmount: 1.4 },
];
export const upcomingDividends: DividendEvent[] = dividendStocks.slice(0, 8).map((s) => ({
  symbol: s.symbol, name: s.name, region: s.region, exDate: s.nextExDate || "2026-10-01", payDate: s.nextPayDate || "2026-10-15",
  amount: s.lastAmount, currency: s.currency, frequency: s.frequency as DividendEvent["frequency"], yieldApprox: s.yieldApprox,
}));
