import { normalizeSearchText } from "./search-text";
/**
 * Universo de la app: BMV, BIVA y SIC (Mercado Global).
 * Locales: acciones, FIBRAs y ETFs/TRACs mexicanos con operatividad razonable.
 */

import {
  SIC_ALL,
  SIC_STOCKS,
  SIC_ETFS,
  type SicItem,
  searchSic,
  isSicSymbol,
} from "./sic-catalog";
import {
  DIV_MX_STOCKS,
  DIV_SIC_STOCKS,
  DIV_ETFS,
  paysDividend,
} from "./dividend-payers";
import { normalizeYahooSymbol } from "./market-data/types";

export type MxKind = "stock" | "etf" | "fibra" | "bond_etf";

export type MxItem = {
  symbol: string;
  name: string;
  kind: MxKind;
  venue: "BMV" | "BIVA" | "SIC" | "BMV/BIVA";
};

/** Acciones locales BMV/BIVA (prioridad liquidez) */
export const MX_LOCAL_STOCKS: MxItem[] = [
  { symbol: "AMXL.MX", name: "América Móvil", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "AMXB.MX", name: "América Móvil B", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "WALMEX.MX", name: "Walmart de México", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "GFNORTEO.MX", name: "GFNorte (Banorte)", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "GMEXICOB.MX", name: "Grupo México", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "FEMSAUBD.MX", name: "FEMSA", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "BIMBOA.MX", name: "Bimbo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "CEMEXCPO.MX", name: "Cemex CPO", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "TLEVISACPO.MX", name: "Televisa CPO", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "KIMBERA.MX", name: "Kimberly-Clark de México", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "ASURB.MX", name: "ASUR", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "GAPB.MX", name: "GAP", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "OMAB.MX", name: "OMA", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "GFINBURO.MX", name: "Inbursa", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "BOLSAA.MX", name: "Bolsa Mexicana de Valores", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "GCARSOA1.MX", name: "Grupo Carso", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "GENTERA.MX", name: "Gentera", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "ALSEA.MX", name: "Alsea", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "AC.MX", name: "Arca Continental", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "KOFUBL.MX", name: "Coca-Cola FEMSA", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "PE&OLES.MX", name: "Peñoles", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "ALFAA.MX", name: "Alfa", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "ALPEKA.MX", name: "Alpek", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "LIVEPOLC-1.MX", name: "Liverpool", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "MEGACPO.MX", name: "Megacable", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "ORBIA.MX", name: "Orbia", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "PINFRA.MX", name: "PINFRA", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "CUERVO.MX", name: "Becle (José Cuervo)", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "GRUMAB.MX", name: "Gruma", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "LABB.MX", name: "Genomma Lab", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "BBAJIOO.MX", name: "Banco del Bajío", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "CHDRAUIB.MX", name: "Chedraui", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "VESTA.MX", name: "Vesta", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "GCC.MX", name: "GCC", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "RA.MX", name: "Regional", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "Q.MX", name: "Qualitas", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "AGUA.MX", name: "Grupo Rotoplas", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "NEMAK.MX", name: "Nemak", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "VOLAR.MX", name: "Volaris", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "IDEALB-1.MX", name: "IDEAL", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "GPROFUT.MX", name: "Grupo Profuturo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "FRAGUAB.MX", name: "Fragua", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "BACHOCOB.MX", name: "Bachoco", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "HERDEZ.MX", name: "Herdez", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "VINTE.MX", name: "Vinte", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "HCITY.MX", name: "Hoteles City", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "GFREGIOO.MX", name: "Banregio", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "ICHB.MX", name: "Industrias CH", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "KUO.MX", name: "Grupo KUO", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "LAMOSA.MX", name: "Lamosa", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "SIMECB.MX", name: "Grupo Simec", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "SORIANAB.MX", name: "Organización Soriana", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "GISSAA.MX", name: "Grupo Industrial Saltillo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "CMOCTEZ.MX", name: "Cementos Moctezuma", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "ACTINVRB.MX", name: "Corporación Actinver", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "AXTELCPO.MX", name: "Axtel CPO", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "SITES1A-1.MX", name: "Sites Latinoamérica", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "GNP.MX", name: "Grupo Nacional Provincial", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "INVEXA.MX", name: "Invex Controladora", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "BAFARB.MX", name: "Grupo Bafar", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "ARA.MX", name: "Consorcio ARA", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "MEDICA.MX", name: "Médica Sur", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "RLH.MX", name: "RLH Properties", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "ELEMENT.MX", name: "Elementia", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "POCHTEC.MX", name: "Grupo Pochteca", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "VITRO.MX", name: "Vitro", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "POSADASA.MX", name: "Grupo Posadas", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "HOTEL.MX", name: "Grupo Hotelero Santa Fe", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "GBMO.MX", name: "Grupo Bursátil Mexicano", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "FINAMEXO.MX", name: "Casa de Bolsa Finamex", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "VALUEGFO.MX", name: "Value Grupo Financiero", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "CABLECPO.MX", name: "Cablevisión CPO", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "CERAMICB.MX", name: "Internacional de Cerámica", kind: "stock", venue: "BMV/BIVA" },
];

/**
 * FIBRAs / Fibras E listadas (universo real ~20–25; no existen 50 líquidas).
 */
export const MX_FIBRAS: MxItem[] = [
  { symbol: "FUNO11.MX", name: "Fibra UNO", kind: "fibra", venue: "BMV/BIVA" },
  { symbol: "FMTY14.MX", name: "Fibra Mty", kind: "fibra", venue: "BMV/BIVA" },
  { symbol: "DANHOS13.MX", name: "Fibra Danhos", kind: "fibra", venue: "BMV/BIVA" },
  { symbol: "FIBRAPL14.MX", name: "Fibra Prologis", kind: "fibra", venue: "BMV/BIVA" },
  { symbol: "TERRA13.MX", name: "Fibra Terra", kind: "fibra", venue: "BMV/BIVA" },
  { symbol: "FSHOP13.MX", name: "Fibra Shop", kind: "fibra", venue: "BMV/BIVA" },
  { symbol: "FHIPO14.MX", name: "FHipo", kind: "fibra", venue: "BMV/BIVA" },
  { symbol: "FNOVA17.MX", name: "Fibra Nova", kind: "fibra", venue: "BMV/BIVA" },
  { symbol: "FIHO12.MX", name: "Fibra Hotel", kind: "fibra", venue: "BMV/BIVA" },
  { symbol: "STORAGE18.MX", name: "Fibra Storage", kind: "fibra", venue: "BMV/BIVA" },
  { symbol: "EDUCA18.MX", name: "Fibra Educa", kind: "fibra", venue: "BMV/BIVA" },
  { symbol: "FINN13.MX", name: "Fibra Inn", kind: "fibra", venue: "BMV/BIVA" },
  { symbol: "FPLUS16.MX", name: "Fibra Plus", kind: "fibra", venue: "BMV/BIVA" },
  { symbol: "FIBRAUP18.MX", name: "Fibra Upsite", kind: "fibra", venue: "BMV/BIVA" },
  { symbol: "FCFE18.MX", name: "CFE Fibra E", kind: "fibra", venue: "BMV/BIVA" },
  { symbol: "FMX23.MX", name: "FMX23", kind: "fibra", venue: "BMV/BIVA" },
  { symbol: "FEXI21.MX", name: "Fibra EXI", kind: "fibra", venue: "BMV/BIVA" },
  { symbol: "AGRO22.MX", name: "AgroFibra / Patria", kind: "fibra", venue: "BMV/BIVA" },
  { symbol: "NEXT25.MX", name: "Fibra NEXT", kind: "fibra", venue: "BMV/BIVA" },
  { symbol: "SOMA22.MX", name: "Fibra Soma", kind: "fibra", venue: "BMV/BIVA" },
  { symbol: "ORION20.MX", name: "Fibra Orión", kind: "fibra", venue: "BMV/BIVA" },
  { symbol: "XINFRA22.MX", name: "Xinfra Fibra E", kind: "fibra", venue: "BMV/BIVA" },
  { symbol: "FIBRAEMX.MX", name: "FIBRAeMX", kind: "fibra", venue: "BMV/BIVA" },
];

/** ETFs / TRACs listados en BMV/BIVA (domicilio MX) */
export const MX_LOCAL_ETFS: MxItem[] = [
  { symbol: "NAFTRAC.MX", name: "iShares NAFTRAC (IPC)", kind: "etf", venue: "BMV/BIVA" },
  { symbol: "MEXTRAC.MX", name: "MEXTRAC 09", kind: "etf", venue: "BMV/BIVA" },
  { symbol: "ILCTRAC.MX", name: "iShares IPC Large Cap TRAC", kind: "etf", venue: "BMV/BIVA" },
  { symbol: "IMCTRAC.MX", name: "iShares IPC Mid Cap TRAC", kind: "etf", venue: "BMV/BIVA" },
  { symbol: "ICMTRAC.MX", name: "IPC CompMx TRAC", kind: "etf", venue: "BMV/BIVA" },
  { symbol: "IMXTRAC.MX", name: "iShares IMXTRAC", kind: "etf", venue: "BMV/BIVA" },
  { symbol: "FIBRATC.MX", name: "ETF S&P/BMV FIBRAS", kind: "etf", venue: "BMV/BIVA" },
  { symbol: "VMEX.MX", name: "Vanguard FTSE BIVA México", kind: "etf", venue: "BMV/BIVA" },
  { symbol: "IVVPESO.MX", name: "iShares S&P 500 MXN Hedged", kind: "etf", venue: "BMV/BIVA" },
  { symbol: "ESGMEX.MX", name: "ESG México", kind: "etf", venue: "BMV/BIVA" },
  { symbol: "CETETRC.MX", name: "iShares CETETRAC", kind: "etf", venue: "BMV/BIVA" },
  { symbol: "UDITRAC.MX", name: "iShares UDITRAC", kind: "etf", venue: "BMV/BIVA" },
  { symbol: "M5TRAC.MX", name: "iShares M5TRAC", kind: "etf", venue: "BMV/BIVA" },
  { symbol: "M10TRAC.MX", name: "iShares M10TRAC", kind: "etf", venue: "BMV/BIVA" },
  { symbol: "CORPTRC.MX", name: "iShares Mexico Corporate Bond TRAC", kind: "etf", venue: "BMV/BIVA" },
  { symbol: "DIABLOI.MX", name: "DIABLOI inverso IPC", kind: "etf", venue: "BMV/BIVA" },
  { symbol: "CHNTRAC.MX", name: "BBVA China SX20 TRAC", kind: "etf", venue: "BMV/BIVA" },
  { symbol: "CONSUMO.MX", name: "BBVA México Consumo TRAC", kind: "etf", venue: "BMV/BIVA" },
  { symbol: "ENLACE.MX", name: "BBVA México Enlace TRAC", kind: "etf", venue: "BMV/BIVA" },
  { symbol: "CONSTRU.MX", name: "BBVA México Construye TRAC", kind: "etf", venue: "BMV/BIVA" },
  { symbol: "SMARTRC.MX", name: "SMART TRAC", kind: "etf", venue: "BMV/BIVA" },
  { symbol: "BRTRAC.MX", name: "BRTRAC", kind: "etf", venue: "BMV/BIVA" },
  { symbol: "DLRTRAC.MX", name: "DLRTRAC", kind: "etf", venue: "BMV/BIVA" },
  { symbol: "MEXMTUM.MX", name: "iShares MSCI Mexico Momentum TRAC", kind: "etf", venue: "BMV/BIVA" },
  { symbol: "MEXRISK.MX", name: "iShares MSCI Mexico Risk TRAC", kind: "etf", venue: "BMV/BIVA" },
];

/** ETFs de bonos vía SIC (complemento) */
export const MX_BOND_ETFS: MxItem[] = [
  { symbol: "LQD", name: "iShares Corp. grado inversión", kind: "bond_etf", venue: "SIC" },
  { symbol: "HYG", name: "iShares High Yield", kind: "bond_etf", venue: "SIC" },
  { symbol: "JNK", name: "SPDR High Yield", kind: "bond_etf", venue: "SIC" },
  { symbol: "VCIT", name: "Vanguard Corp. intermedio", kind: "bond_etf", venue: "SIC" },
  { symbol: "VCSH", name: "Vanguard Corp. corto", kind: "bond_etf", venue: "SIC" },
  { symbol: "BND", name: "Vanguard Total Bond", kind: "bond_etf", venue: "SIC" },
  { symbol: "AGG", name: "iShares Core US Aggregate Bond", kind: "bond_etf", venue: "SIC" },
  { symbol: "TIP", name: "iShares TIPS", kind: "bond_etf", venue: "SIC" },
  { symbol: "EMB", name: "iShares USD Emerging Markets Bond", kind: "bond_etf", venue: "SIC" },
  { symbol: "USHY", name: "iShares Broad USD High Yield", kind: "bond_etf", venue: "SIC" },
];

function sicToMx(i: SicItem): MxItem {
  return {
    symbol: i.symbol,
    name: i.name,
    kind: i.kind === "etf" ? "etf" : "stock",
    venue: "SIC",
  };
}

/** Universo completo BMV + BIVA + SIC */
export const MX_UNIVERSE: MxItem[] = (() => {
  const map = new Map<string, MxItem>();
  const add = (item: MxItem) => {
    const k = item.symbol.toUpperCase();
    if (!map.has(k)) map.set(k, item);
  };
  for (const x of MX_LOCAL_STOCKS) add(x);
  for (const x of DIV_MX_STOCKS) add(x);
  for (const x of MX_FIBRAS) add(x);
  for (const x of MX_LOCAL_ETFS) add(x);
  for (const x of MX_BOND_ETFS) add(x);
  for (const x of SIC_ALL) add(sicToMx(x));
  for (const x of DIV_SIC_STOCKS) add(sicToMx(x));
  for (const x of DIV_ETFS) add(sicToMx(x));
  return [...map.values()];
})();

export function normalizeMxSymbol(raw: string): string {
  return normalizeYahooSymbol(raw);
}

export function isInMxUniverse(symbol: string): boolean {
  const s = normalizeMxSymbol(symbol);
  const bare = s.replace(/\.MX$/, "");
  if (isSicSymbol(bare) || isSicSymbol(s)) return true;
  return MX_UNIVERSE.some(
    (i) =>
      i.symbol.toUpperCase() === s ||
      i.symbol.toUpperCase().replace(/\.MX$/, "") === bare
  );
}

export function searchMxUniverse(
  q: string,
  limit = 20
): Array<{
  symbol: string;
  name: string;
  type: string;
  region: string;
  exchange: string;
}> {
  const rawNeedle = normalizeSearchText(q);
  if (!rawNeedle) return [];
  const canonicalNeedle = normalizeYahooSymbol(rawNeedle);
  const needles = [...new Set([rawNeedle, canonicalNeedle])];

  const local = MX_UNIVERSE.filter((item) =>
    needles.some(
      (needle) =>
        item.symbol.toUpperCase().includes(needle) ||
        normalizeSearchText(item.name).includes(needle) ||
        item.symbol.replace(/\.MX$/, "").includes(needle)
    )
  );

  const fromSic = searchSic(rawNeedle).map(sicToMx);

  const map = new Map<string, MxItem>();
  for (const i of [...local, ...fromSic]) {
    map.set(i.symbol.toUpperCase(), i);
  }

  return [...map.values()].slice(0, limit).map((i) => ({
    symbol: i.symbol,
    name: i.name,
    type: i.kind,
    region: i.venue === "SIC" ? "SIC" : "MX",
    exchange: i.venue,
    dividend: paysDividend(i.symbol),
  }));
}

export function mxUniverseStats() {
  return {
    stocksLocal: MX_LOCAL_STOCKS.length,
    fibras: MX_FIBRAS.length,
    localEtfs: MX_LOCAL_ETFS.length,
    bondEtfs: MX_BOND_ETFS.length,
    sicStocks: SIC_STOCKS.length,
    sicEtfs: SIC_ETFS.length,
    totalUnique: MX_UNIVERSE.length,
  };
}

export { SIC_STOCKS, SIC_ETFS, SIC_ALL };
