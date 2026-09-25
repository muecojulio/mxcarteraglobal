export type FibraMeta = { symbol: string; name: string; propertyTypes: string[]; occupancyPct: number | null; focus: string; fiscalResultPct: number | null; capitalReturnPct: number | null };
const MAP: Record<string, FibraMeta> = {
  "FUNO11.MX": { symbol: "FUNO11.MX", name: "Fibra UNO", propertyTypes: ["Retail", "Industrial"], occupancyPct: null, focus: "Diversificado", fiscalResultPct: 55, capitalReturnPct: 45 },
  "FMTY14.MX": { symbol: "FMTY14.MX", name: "Fibra Mty", propertyTypes: ["Industrial"], occupancyPct: null, focus: "Norte", fiscalResultPct: 60, capitalReturnPct: 40 },
};
export function getFibraMeta(symbol: string): FibraMeta | null {
  const s = symbol.toUpperCase();
  return MAP[s] || MAP[s.endsWith(".MX") ? s : `${s}.MX`] || null;
}
export function splitFibraDistribution(gross: number, meta: FibraMeta | null) {
  const fiscal = meta?.fiscalResultPct ?? 50;
  const cap = meta?.capitalReturnPct ?? 50;
  return { fiscal: gross * (fiscal / 100), capital: gross * (cap / 100) };
}
