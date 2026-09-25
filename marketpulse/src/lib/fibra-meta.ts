export type FibraMeta = {
  symbol: string;
  name: string;
  propertyTypes: string[];
  occupancyPct: number | null;
  focus: string;
  website?: string;
  fiscalResultPct: number | null;
  capitalReturnPct: number | null;
  distributionNote?: string;
};

const MAP: Record<string, FibraMeta> = {
  "FUNO11.MX": { symbol: "FUNO11.MX", name: "Fibra UNO", propertyTypes: ["Retail", "Industrial", "Oficinas", "Mixto"], occupancyPct: null, focus: "Portafolio diversificado, la FIBRA más grande de México", fiscalResultPct: 55, capitalReturnPct: 45, distributionNote: "Desglose varía por mes; revisa aviso de distribución FUNO." },
  "FMTY14.MX": { symbol: "FMTY14.MX", name: "Fibra Mty", propertyTypes: ["Industrial", "Oficinas"], occupancyPct: null, focus: "Inmuebles industriales y de oficinas, enfoque Norte", fiscalResultPct: 60, capitalReturnPct: 40 },
  "DANHOS13.MX": { symbol: "DANHOS13.MX", name: "Fibra Danhos", propertyTypes: ["Retail", "Oficinas"], occupancyPct: null, focus: "Centros comerciales y oficinas en CDMX", fiscalResultPct: 65, capitalReturnPct: 35 },
  "NEXT25.MX": { symbol: "NEXT25.MX", name: "Fibra NEXT", propertyTypes: ["Inmobiliario"], occupancyPct: null, focus: "FIBRA NEXT (NEXT25) listada en México", fiscalResultPct: 55, capitalReturnPct: 45 },
  "FEXI21.MX": { symbol: "FEXI21.MX", name: "Fibra EXI", propertyTypes: ["Infraestructura"], occupancyPct: null, focus: "Infraestructura", fiscalResultPct: 60, capitalReturnPct: 40 },
};

export function getFibraMeta(symbol: string): FibraMeta | null {
  const s = symbol.toUpperCase().replace(/\.MXN$/, ".MX");
  if (MAP[s]) return MAP[s];
  const base = s.replace(/\.MX$/, "");
  for (const [k, v] of Object.entries(MAP)) {
    if (k.replace(/\.MX$/, "") === base) return v;
  }
  if (base.startsWith("FIBRA") || /^(FUNO|DANHOS|TERRA|FSHOP|FIHO|FHIPO|FNOVA|FMTY|EDUCA|STORAGE|FINN|FPLUS|FCFE|FMX23|NEXT25|NEXT)/.test(base)) {
    return { symbol: s, name: base, propertyTypes: ["Inmobiliario"], occupancyPct: null, focus: "FIBRA listada en México", fiscalResultPct: null, capitalReturnPct: null, distributionNote: "Sin desglose cargado; usa el aviso de distribución del fiduciario." };
  }
  return null;
}

export function splitFibraDistribution(amountPerCbfi: number, meta: FibraMeta | null): { fiscal: number | null; capital: number | null; fiscalPct: number | null; capitalPct: number | null } {
  if (!meta || meta.fiscalResultPct == null || meta.capitalReturnPct == null) {
    return { fiscal: null, capital: null, fiscalPct: meta?.fiscalResultPct ?? null, capitalPct: meta?.capitalReturnPct ?? null };
  }
  return {
    fiscal: amountPerCbfi * (meta.fiscalResultPct / 100),
    capital: amountPerCbfi * (meta.capitalReturnPct / 100),
    fiscalPct: meta.fiscalResultPct,
    capitalPct: meta.capitalReturnPct,
  };
}
