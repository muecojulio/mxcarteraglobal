/**
 * Datos de dividendos de referencia.
 * Finnhub free no incluye el endpoint de dividendos históricos,
 * por eso usamos un dataset curado de acciones populares (US + MX).
 */

export type DividendEvent = {
  symbol: string;
  name: string;
  region: "MX" | "US";
  exDate: string;
  payDate: string;
  amount: number;
  currency: "USD" | "MXN";
  frequency: "trimestral" | "mensual" | "anual" | "semestral";
  yieldApprox?: number;
};

export type DividendStock = {
  symbol: string;
  name: string;
  region: "MX" | "US";
  currency: "USD" | "MXN";
  frequency: string;
  annualDividend: number;
  yieldApprox: number;
  lastAmount: number;
  nextExDate?: string;
  nextPayDate?: string;
};

export const dividendStocks: DividendStock[] = [
  { symbol: "AAPL", name: "Apple Inc.", region: "US", currency: "USD", frequency: "trimestral", annualDividend: 1.0, yieldApprox: 0.33, lastAmount: 0.25, nextExDate: "2026-08-11", nextPayDate: "2026-08-14" },
  { symbol: "MSFT", name: "Microsoft Corp.", region: "US", currency: "USD", frequency: "trimestral", annualDividend: 3.32, yieldApprox: 0.67, lastAmount: 0.83, nextExDate: "2026-08-21", nextPayDate: "2026-09-11" },
  { symbol: "JNJ", name: "Johnson & Johnson", region: "US", currency: "USD", frequency: "trimestral", annualDividend: 5.2, yieldApprox: 3.2, lastAmount: 1.3, nextExDate: "2026-08-26", nextPayDate: "2026-09-09" },
  { symbol: "KO", name: "Coca-Cola Co.", region: "US", currency: "USD", frequency: "trimestral", annualDividend: 2.04, yieldApprox: 2.9, lastAmount: 0.51, nextExDate: "2026-09-15", nextPayDate: "2026-10-01" },
  { symbol: "O", name: "Realty Income", region: "US", currency: "USD", frequency: "mensual", annualDividend: 3.17, yieldApprox: 5.5, lastAmount: 0.264, nextExDate: "2026-09-01", nextPayDate: "2026-09-15" },
  { symbol: "SCHD", name: "Schwab US Dividend Equity ETF", region: "US", currency: "USD", frequency: "trimestral", annualDividend: 1.05, yieldApprox: 3.6, lastAmount: 0.26, nextExDate: "2026-09-24", nextPayDate: "2026-09-29" },
  { symbol: "AMXL.MX", name: "América Móvil", region: "MX", currency: "MXN", frequency: "anual", annualDividend: 0.46, yieldApprox: 2.9, lastAmount: 0.46, nextExDate: "2026-07-15", nextPayDate: "2026-07-25" },
  { symbol: "WALMEX.MX", name: "Walmart de México", region: "MX", currency: "MXN", frequency: "trimestral", annualDividend: 1.8, yieldApprox: 2.9, lastAmount: 0.45, nextExDate: "2026-08-20", nextPayDate: "2026-09-05" },
  { symbol: "GFNORTEO.MX", name: "Banorte", region: "MX", currency: "MXN", frequency: "trimestral", annualDividend: 8.5, yieldApprox: 5.7, lastAmount: 2.12, nextExDate: "2026-08-28", nextPayDate: "2026-09-10" },
  { symbol: "FEMSAUBD.MX", name: "FEMSA", region: "MX", currency: "MXN", frequency: "anual", annualDividend: 4.2, yieldApprox: 2.1, lastAmount: 4.2, nextExDate: "2026-05-12", nextPayDate: "2026-05-20" },
  { symbol: "BIMBOA.MX", name: "Grupo Bimbo", region: "MX", currency: "MXN", frequency: "anual", annualDividend: 1.1, yieldApprox: 1.5, lastAmount: 1.1, nextExDate: "2026-06-18", nextPayDate: "2026-06-30" },
  { symbol: "PG", name: "Procter & Gamble", region: "US", currency: "USD", frequency: "trimestral", annualDividend: 4.03, yieldApprox: 2.4, lastAmount: 1.0067, nextExDate: "2026-08-22", nextPayDate: "2026-08-15" },
];

export const upcomingDividends: DividendEvent[] = [
  { symbol: "AAPL", name: "Apple Inc.", region: "US", exDate: "2026-08-11", payDate: "2026-08-14", amount: 0.25, currency: "USD", frequency: "trimestral", yieldApprox: 0.33 },
  { symbol: "MSFT", name: "Microsoft Corp.", region: "US", exDate: "2026-08-21", payDate: "2026-09-11", amount: 0.83, currency: "USD", frequency: "trimestral" },
  { symbol: "WALMEX.MX", name: "Walmart de México", region: "MX", exDate: "2026-08-20", payDate: "2026-09-05", amount: 0.45, currency: "MXN", frequency: "trimestral" },
  { symbol: "JNJ", name: "Johnson & Johnson", region: "US", exDate: "2026-08-26", payDate: "2026-09-09", amount: 1.3, currency: "USD", frequency: "trimestral" },
  { symbol: "GFNORTEO.MX", name: "Banorte", region: "MX", exDate: "2026-08-28", payDate: "2026-09-10", amount: 2.12, currency: "MXN", frequency: "trimestral" },
  { symbol: "O", name: "Realty Income", region: "US", exDate: "2026-09-01", payDate: "2026-09-15", amount: 0.264, currency: "USD", frequency: "mensual" },
  { symbol: "KO", name: "Coca-Cola Co.", region: "US", exDate: "2026-09-15", payDate: "2026-10-01", amount: 0.51, currency: "USD", frequency: "trimestral" },
  { symbol: "SCHD", name: "Schwab US Dividend ETF", region: "US", exDate: "2026-09-24", payDate: "2026-09-29", amount: 0.26, currency: "USD", frequency: "trimestral" },
];
