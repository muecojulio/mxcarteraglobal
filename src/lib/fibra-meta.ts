export type FibraMeta = {
  symbol: string; name: string; propertyTypes: string[]; occupancyPct: number | null; focus: string; website?: string;
  fiscalResultPct: number | null; capitalReturnPct: number | null; distributionNote?: string;
};
const MAP: Record<string, FibraMeta> = {
  "FUNO11.MX": { symbol: "FUNO11.MX", name: "Fibra UNO", propertyTypes: ["Retail", "Industrial", "Oficinas", "Mixto"], occupancyPct: null, focus: "Portafolio diversificado, la FIBRA más grande de México", fiscalResultPct: 55, capitalReturnPct: 45, distributionNote: "Desglose varía por mes; revisa aviso de distribución FUNO." },
  "FMTY14.MX": { symbol: "FMTY14.MX", name: "Fibra Mty", propertyTypes: ["Industrial", "Oficinas"], occupancyPct: null, focus: "Norte de México, industrial y oficinas", fiscalResultPct: 60, capitalReturnPct: 40 },
  "DANHOS13.MX": { symbol: "DANHOS13.MX", name: "Fibra Danhos", propertyTypes: ["Retail", "Oficinas"], occupancyPct: null, focus: "Centros comerciales y oficinas prime CDMX", fiscalResultPct: 50, capitalReturnPct: 50 },
  "FIBRAPL14.MX": { symbol: "FIBRAPL14.MX", name: "Fibra Prologis", propertyTypes: ["Industrial"], occupancyPct: null, focus: "Naves logísticas clase A", fiscalResultPct: 45, capitalReturnPct: 55 },
  "TERRA13.MX": { symbol: "TERRA13.MX", name: "Fibra Terra", propertyTypes: ["Industrial"], occupancyPct: null, focus: "Industrial y logística", fiscalResultPct: 50, capitalReturnPct: 50 },
  "FSHOP13.MX": { symbol: "FSHOP13.MX", name: "Fibra Shop", propertyTypes: ["Retail"], occupancyPct: null, focus: "Centros comerciales", fiscalResultPct: 55, capitalReturnPct: 45 },
  "FHIPO14.MX": { symbol: "FHIPO14.MX", name: "FHipo", propertyTypes: ["Hipotecario"], occupancyPct: null, focus: "Créditos hipotecarios", fiscalResultPct: 70, capitalReturnPct: 30 },
  "FNOVA17.MX": { symbol: "FNOVA17.MX", name: "Fibra Nova", propertyTypes: ["Industrial"], occupancyPct: null, focus: "Industrial norte", fiscalResultPct: 50, capitalReturnPct: 50 },
  "FIHO12.MX": { symbol: "FIHO12.MX", name: "Fibra Hotel", propertyTypes: ["Hotelero"], occupancyPct: null, focus: "Hoteles", fiscalResultPct: 60, capitalReturnPct: 40 },
  "STORAGE18.MX": { symbol: "STORAGE18.MX", name: "Fibra Storage", propertyTypes: ["Storage"], occupancyPct: null, focus: "Self-storage", fiscalResultPct: 50, capitalReturnPct: 50 },
  "EDUCA18.MX": { symbol: "EDUCA18.MX", name: "Fibra Educa", propertyTypes: ["Educativo"], occupancyPct: null, focus: "Inmuebles educativos", fiscalResultPct: 55, capitalReturnPct: 45 },
  "FINN13.MX": { symbol: "FINN13.MX", name: "Fibra Inn", propertyTypes: ["Hotelero"], occupancyPct: null, focus: "Hoteles select service", fiscalResultPct: 55, capitalReturnPct: 45 },
  "FPLUS16.MX": { symbol: "FPLUS16.MX", name: "Fibra Plus", propertyTypes: ["Desarrollo"], occupancyPct: null, focus: "Desarrollos y plusvalía", fiscalResultPct: 40, capitalReturnPct: 60 },
  "FIBRAUP18.MX": { symbol: "FIBRAUP18.MX", name: "Fibra Upsite", propertyTypes: ["Industrial"], occupancyPct: null, focus: "Parques industriales", fiscalResultPct: 50, capitalReturnPct: 50 },
  "FCFE18.MX": { symbol: "FCFE18.MX", name: "CFE Fibra E", propertyTypes: ["Energía"], occupancyPct: null, focus: "Infraestructura eléctrica", fiscalResultPct: 80, capitalReturnPct: 20 },
  "FMX23.MX": { symbol: "FMX23.MX", name: "FMX23", propertyTypes: ["Mixto"], occupancyPct: null, focus: "FIBRA listada", fiscalResultPct: null, capitalReturnPct: null },
  "NEXT25.MX": { symbol: "NEXT25.MX", name: "Fibra NEXT", propertyTypes: ["Industrial"], occupancyPct: null, focus: "Industrial", fiscalResultPct: null, capitalReturnPct: null },
  "FEXI21.MX": { symbol: "FEXI21.MX", name: "Fibra EXI", propertyTypes: ["Energía"], occupancyPct: null, focus: "Infraestructura energética", fiscalResultPct: null, capitalReturnPct: null },
};
export function getFibraMeta(symbol: string): FibraMeta | null {
  const s = symbol.toUpperCase();
  return MAP[s] || MAP[s.endsWith(".MX") ? s : `${s}.MX`] || null;
}
export function splitFibraDistribution(amount: number, meta: FibraMeta | null): { fiscal: number | null; capital: number | null } {
  if (!meta || amount == null || !Number.isFinite(amount)) return { fiscal: null, capital: null };
  if (meta.fiscalResultPct == null || meta.capitalReturnPct == null) return { fiscal: null, capital: null };
  return { fiscal: amount * (meta.fiscalResultPct / 100), capital: amount * (meta.capitalReturnPct / 100) };
}
export const FIBRA_SYMBOLS = Object.keys(MAP);
