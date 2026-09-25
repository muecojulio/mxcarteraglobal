export type TaxScenario = "w8ben" | "no_w8ben";
export const US_DIV_WITHHOLDING: Record<TaxScenario, number> = { w8ben: 0.1, no_w8ben: 0.3 };
export const MX_DIV_ISR_ESTIMATE = 0.1;
export type TaxEstimateInput = { grossDividend: number; assetKind: "us_stock" | "us_etf" | "mx_stock" | "fibra"; scenario: TaxScenario };
export type TaxEstimateResult = { gross: number; usWithholding: number; mxEstimate: number; netApprox: number; effectiveRate: number; notes: string[] };
export function estimateDividendTax(input: TaxEstimateInput): TaxEstimateResult {
  const { grossDividend: gross, assetKind, scenario } = input;
  const notes: string[] = [];
  let usWithholding = 0;
  let mxEstimate = 0;
  if (assetKind === "us_stock" || assetKind === "us_etf") {
    usWithholding = gross * US_DIV_WITHHOLDING[scenario];
    notes.push(scenario === "w8ben" ? "Retención US estimada 10% (W-8BEN)." : "Retención US estimada 30%.");
  } else if (assetKind === "mx_stock") {
    mxEstimate = gross * MX_DIV_ISR_ESTIMATE;
  } else if (assetKind === "fibra") {
    mxEstimate = gross * 0.15;
  }
  const netApprox = Math.max(0, gross - usWithholding - mxEstimate);
  const effectiveRate = gross > 0 ? (gross - netApprox) / gross : 0;
  notes.push("Solo fines educativos.");
  return { gross, usWithholding, mxEstimate, netApprox, effectiveRate, notes };
}
export function detectTaxAssetKind(symbol: string, assetType?: string): TaxEstimateInput["assetKind"] {
  const s = symbol.toUpperCase();
  if (assetType === "fibra" || s.includes("FUNO") || s.startsWith("FIBRA") || /^(FMTY|DANHOS|TERRA|FSHOP|FIHO|FHIPO|FNOVA)/.test(s)) return "fibra";
  if (s.endsWith(".MX") || s.endsWith(".MXN")) return "mx_stock";
  return "us_stock";
}
