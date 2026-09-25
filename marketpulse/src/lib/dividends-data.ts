export type DividendStock = { symbol: string; name: string; region: "MX" | "US"; annualDividend: number; yieldApprox: number };
export const dividendStocks: DividendStock[] = [
  { symbol: "AAPL", name: "Apple Inc.", region: "US", annualDividend: 1, yieldApprox: 0.33 },
  { symbol: "MSFT", name: "Microsoft Corp.", region: "US", annualDividend: 3.32, yieldApprox: 0.67 },
];
