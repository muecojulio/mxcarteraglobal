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
    const rate = US_DIV_WITHHOLDING[scenario];
    usWithholding = gross * rate;
    notes.push(scenario === "w8ben" ? "Retención US estimada 10% (tratado con W-8BEN vigente en el broker)." : "Retención US estimada 30% (sin W-8BEN / tratado no aplicado).");
    notes.push("En México el dividendo extranjero puede acumularse; a veces se acredita parte de la retención US. Consulta a tu contador.");
  } else if (assetKind === "mx_stock") {
    mxEstimate = gross * MX_DIV_ISR_ESTIMATE;
    notes.push("ISR orientativo ~10% sobre dividendos de acciones MX (puede haber retención en fuente). Confirma tasa vigente.");
  } else if (assetKind === "fibra") {
    mxEstimate = gross * 0.15;
    notes.push("FIBRA: el tratamiento depende de si la distribución es retorno de capital, resultado fiscal, etc.");
    notes.push("Revisa la constancia del fiduciario/broker; no todo el cash yield tributa igual.");
  }
  const netApprox = Math.max(0, gross - usWithholding - mxEstimate);
  notes.push("Solo fines educativos. No sustituye opinión de contador público ni del SAT.");
  return { gross, usWithholding, mxEstimate, netApprox, effectiveRate: gross > 0 ? (gross - netApprox) / gross : 0, notes };
}
export function detectTaxAssetKind(symbol: string, assetType?: string): TaxEstimateInput["assetKind"] {
  const s = symbol.toUpperCase();
  if (assetType === "fibra" || s.includes("FUNO") || s.startsWith("FIBRA") || /^(FMTY|DANHOS|TERRA|FSHOP|FIHO|FHIPO|FNOVA)/.test(s)) return "fibra";
  if (s.endsWith(".MX") || s.endsWith(".MXN")) return "mx_stock";
  return "us_stock";
}
