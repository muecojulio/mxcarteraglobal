/**
 * Metadatos de FIBRAs MX (referencia educativa).
 * Ocupación y mix de inmuebles cambian; APIs free casi no los publican.
 * Resultado fiscal vs reembolso de capital: viene en avisos de distribución
 * del fiduciario; aquí van % orientativos cuando se conocen (no son oficiales en vivo).
 */

export type FibraMeta = {
  symbol: string;
  name: string;
  propertyTypes: string[];
  /** % ocupación aprox. si se conoce; null = no disponible en free */
  occupancyPct: number | null;
  focus: string;
  website?: string;
  /**
   * % orientativo de la distribución que suele ir a RESULTADO FISCAL
   * (base gravable típica para persona física). null = sin dato confiable.
   */
  fiscalResultPct: number | null;
  /**
   * % orientativo de REEMBOLSO DE CAPITAL (suele no gravarse como dividendo;
   * reduce costo fiscal de la posición). null = sin dato confiable.
   */
  capitalReturnPct: number | null;
  /** Nota breve sobre el desglose (trimestre/referencia) */
  distributionNote?: string;
};

const MAP: Record<string, FibraMeta> = {
  "FUNO11.MX": {
    symbol: "FUNO11.MX",
    name: "Fibra UNO",
    propertyTypes: ["Retail", "Industrial", "Oficinas", "Mixto"],
    occupancyPct: null,
    focus: "Portafolio diversificado, la FIBRA más grande de México",
    fiscalResultPct: 55,
    capitalReturnPct: 45,
    distributionNote:
      "Desglose varía por mes; revisa aviso de distribución FUNO.",
  },
  "FMTY14.MX": {
    symbol: "FMTY14.MX",
    name: "Fibra Mty",
    propertyTypes: ["Industrial", "Oficinas"],
    occupancyPct: null,
    focus: "Inmuebles industriales y de oficinas, enfoque Norte",
    fiscalResultPct: 60,
    capitalReturnPct: 40,
    distributionNote: "Aprox. según reportes recientes; confirma en constancia.",
  },
  "DANHOS13.MX": {
    symbol: "DANHOS13.MX",
    name: "Fibra Danhos",
    propertyTypes: ["Retail", "Oficinas"],
    occupancyPct: null,
    focus: "Centros comerciales y oficinas en CDMX y área metropolitana",
    fiscalResultPct: 65,
    capitalReturnPct: 35,
    distributionNote: "Aprox.; el % cambia con cada distribución.",
  },
  "FIBRAPL14.MX": {
    symbol: "FIBRAPL14.MX",
    name: "Fibra Prologis",
    propertyTypes: ["Industrial", "Logística"],
    occupancyPct: null,
    focus: "Naves industriales y logística (Prologis)",
    fiscalResultPct: 50,
    capitalReturnPct: 50,
    distributionNote: "Aprox.; valida en aviso trimestral/mensual.",
  },
  "TERRA13.MX": {
    symbol: "TERRA13.MX",
    name: "Terra / Fibra Terra",
    propertyTypes: ["Industrial"],
    occupancyPct: null,
    focus: "Propiedades industriales",
    fiscalResultPct: 55,
    capitalReturnPct: 45,
  },
  "FSHOP13.MX": {
    symbol: "FSHOP13.MX",
    name: "Fibra Shop",
    propertyTypes: ["Retail"],
    occupancyPct: null,
    focus: "Centros comerciales",
    fiscalResultPct: 60,
    capitalReturnPct: 40,
  },
  "FHIPO14.MX": {
    symbol: "FHIPO14.MX",
    name: "Fibra Hipotecaria",
    propertyTypes: ["Hipotecario / créditos"],
    occupancyPct: null,
    focus: "Cartera hipotecaria (no inmobiliario operativo clásico)",
    fiscalResultPct: 70,
    capitalReturnPct: 30,
    distributionNote: "Perfil distinto a FIBRA inmobiliaria clásica.",
  },
  "FNOVA17.MX": {
    symbol: "FNOVA17.MX",
    name: "Fibra Nova",
    propertyTypes: ["Industrial", "Educación", "Otros"],
    occupancyPct: null,
    focus: "Portafolio industrial y alternativos",
    fiscalResultPct: 55,
    capitalReturnPct: 45,
  },
  "FIHO12.MX": {
    symbol: "FIHO12.MX",
    name: "Fibra Hotel",
    propertyTypes: ["Hotelero"],
    occupancyPct: null,
    focus: "Hoteles",
    fiscalResultPct: 50,
    capitalReturnPct: 50,
  },
  "STORAGE18.MX": {
    symbol: "STORAGE18.MX",
    name: "Fibra Storage",
    propertyTypes: ["Self-storage", "Almacenaje"],
    occupancyPct: null,
    focus: "Bodegas de autoalmacenaje",
    fiscalResultPct: 55,
    capitalReturnPct: 45,
  },
  "EDUCA18.MX": {
    symbol: "EDUCA18.MX",
    name: "Fibra Educa",
    propertyTypes: ["Educación"],
    occupancyPct: null,
    focus: "Inmuebles educativos",
    fiscalResultPct: 60,
    capitalReturnPct: 40,
  },
  "FINN13.MX": {
    symbol: "FINN13.MX",
    name: "Fibra Inn",
    propertyTypes: ["Hotelero"],
    occupancyPct: null,
    focus: "Hoteles select service",
    fiscalResultPct: 50,
    capitalReturnPct: 50,
  },
  "FPLUS16.MX": {
    symbol: "FPLUS16.MX",
    name: "Fibra Plus",
    propertyTypes: ["Industrial", "Mixto"],
    occupancyPct: null,
    focus: "Desarrollo e industrial",
    fiscalResultPct: 45,
    capitalReturnPct: 55,
  },
  "FIBRAUP15.MX": {
    symbol: "FIBRAUP15.MX",
    name: "Fibra Upsite",
    propertyTypes: ["Industrial", "Logística"],
    occupancyPct: null,
    focus: "Parques industriales y logística",
    fiscalResultPct: 50,
    capitalReturnPct: 50,
  },
  "FIBRAUP18.MX": {
    symbol: "FIBRAUP18.MX",
    name: "Fibra Upsite",
    propertyTypes: ["Industrial", "Logística"],
    occupancyPct: null,
    focus: "Parques industriales y logística",
    fiscalResultPct: 50,
    capitalReturnPct: 50,
  },
  "FCFE18.MX": {
    symbol: "FCFE18.MX",
    name: "CFE Fibra E",
    propertyTypes: ["Infraestructura energética"],
    occupancyPct: null,
    focus: "Infraestructura eléctrica (Fibra E / CFE)",
    fiscalResultPct: 65,
    capitalReturnPct: 35,
    distributionNote:
      "Fibra E: el mix fiscal/capital cambia por periodo. Confirma el aviso de FCFE18.",
  },
  "FMX23.MX": {
    symbol: "FMX23.MX",
    name: "FMX23",
    propertyTypes: ["Inmobiliario / listado MX"],
    occupancyPct: null,
    focus: "Título listado en México (FMX23). Revisa el aviso del fiduciario.",
    fiscalResultPct: 55,
    capitalReturnPct: 45,
    distributionNote:
      "Desglose orientativo. Valida resultado fiscal vs reembolso en el aviso oficial.",
  },
  "NEXT25.MX": {
    symbol: "NEXT25.MX",
    name: "Fibra NEXT",
    propertyTypes: ["Inmobiliario"],
    occupancyPct: null,
    focus: "FIBRA NEXT (NEXT25) listada en México",
    fiscalResultPct: 55,
    capitalReturnPct: 45,
    distributionNote:
      "Aprox. educativa; el % de cada distribución lo publica el fiduciario.",
  },
  "FEXI21.MX": {
    symbol: "FEXI21.MX",
    name: "Fibra EXI",
    propertyTypes: ["Infraestructura"],
    occupancyPct: null,
    focus: "Infraestructura",
    fiscalResultPct: 60,
    capitalReturnPct: 40,
  },
};

export function getFibraMeta(symbol: string): FibraMeta | null {
  const s = symbol.toUpperCase().replace(/\.MXN$/, ".MX");
  if (MAP[s]) return MAP[s];
  const base = s.replace(/\.MX$/, "");
  for (const [k, v] of Object.entries(MAP)) {
    if (k.replace(/\.MX$/, "") === base) return v;
    if (k.replace(/\.MX$/, "").startsWith(base) || base.startsWith(k.replace(/\.MX$/, "")))
      return v;
  }
  // FIBRA genérica: estructura típica sin % fijos
  if (
    base.startsWith("FIBRA") ||
    /^(FUNO|DANHOS|TERRA|FSHOP|FIHO|FHIPO|FNOVA|FMTY|EDUCA|STORAGE|FINN|FPLUS|FCFE|FMX23|NEXT25|NEXT)/.test(
      base
    )
  ) {
    return {
      symbol: s,
      name: base,
      propertyTypes: ["Inmobiliario"],
      occupancyPct: null,
      focus: "FIBRA listada en México",
      fiscalResultPct: null,
      capitalReturnPct: null,
      distributionNote:
        "Sin desglose cargado; usa el aviso de distribución del fiduciario.",
    };
  }
  return null;
}

/** Desglose orientativo de una distribución en $ por CBFI */
export function splitFibraDistribution(
  amountPerCbfi: number,
  meta: FibraMeta | null
): {
  fiscal: number | null;
  capital: number | null;
  fiscalPct: number | null;
  capitalPct: number | null;
} {
  if (!meta || meta.fiscalResultPct == null || meta.capitalReturnPct == null) {
    return {
      fiscal: null,
      capital: null,
      fiscalPct: meta?.fiscalResultPct ?? null,
      capitalPct: meta?.capitalReturnPct ?? null,
    };
  }
  const f = meta.fiscalResultPct / 100;
  const c = meta.capitalReturnPct / 100;
  return {
    fiscal: amountPerCbfi * f,
    capital: amountPerCbfi * c,
    fiscalPct: meta.fiscalResultPct,
    capitalPct: meta.capitalReturnPct,
  };
}
