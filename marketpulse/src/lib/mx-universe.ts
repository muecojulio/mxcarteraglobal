export type MxKind = "stock" | "etf" | "fibra" | "bond_etf";
export type MxItem = { symbol: string; name: string; kind: MxKind; venue: "BMV" | "BIVA" | "SIC" | "BMV/BIVA" };
export const MX_LOCAL_STOCKS: MxItem[] = [
  { symbol: "AMXL.MX", name: "América Móvil", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "WALMEX.MX", name: "Walmart de México", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "GFNORTEO.MX", name: "GFNorte (Banorte)", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "GMEXICOB.MX", name: "Grupo México", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "FEMSAUBD.MX", name: "FEMSA", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "BIMBOA.MX", name: "Bimbo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "CEMEXCPO.MX", name: "Cemex CPO", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "TLEVISACPO.MX", name: "Televisa CPO", kind: "stock", venue: "BMV/BIVA" },
];
export const MX_FIBRAS: MxItem[] = [
  { symbol: "FUNO11.MX", name: "Fibra UNO", kind: "fibra", venue: "BMV" },
  { symbol: "FMTY14.MX", name: "Fibra Mty", kind: "fibra", venue: "BMV" },
];
export const MX_UNIVERSE: MxItem[] = [...MX_LOCAL_STOCKS, ...MX_FIBRAS];
export function searchMx(q: string): MxItem[] {
  const s = q.trim().toUpperCase();
  if (!s) return [];
  return MX_UNIVERSE.filter((i) => i.symbol.includes(s) || i.name.toUpperCase().includes(s));
}
