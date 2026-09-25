import type { SicItem } from "./sic-types";
export type MxDiv = { symbol: string; name: string; kind: "stock" | "etf" | "fibra" | "bond_etf"; venue: string };
export const DIV_MX_STOCKS: MxDiv[] = ["GFNORTEO","BBAJIOO","RA","GFREGIOO","Q","GPROFUT","GNP","GMEXICOB","AMXL","AMXB","WALMEX","FEMSAUBD","KOFUBL","AC","KIMBERA","ASURB","GAPB","OMAB","BOLSAA","PINFRA","MEGACPO","ORBIA","BIMBOA","GRUMAB","LABB","GENTERA","VESTA","LIVEPOLC-1","CHDRAUIB","SORIANAB","GCARSOA1","GCC","CMOCTEZ","LAMOSA","GISSAA","HERDEZ","BACHOCOB","CUERVO","ALSEA","CEMEXCPO","ALPEKA","ICHB","KUO","SIMECB","FRAGUAB","MEDICA","VINTE","ACTINVRB","INVEXA","AGUA"].map((s) => ({ symbol: `${s}.MX`, name: s, kind: "stock", venue: "BMV/BIVA" }));
export const DIV_SIC_STOCKS: SicItem[] = ["JNJ","PG","KO","PEP","MCD","WMT","HD","LOW","TGT","COST","CL","KMB","GIS","KHC","MO","PM","XOM","CVX","COP","JPM","BAC","WFC","C","MS","GS","BLK","V","MA","AXP","ABBV","MRK","PFE","LLY","AMGN","ABT","MDT","UNH","T","VZ","NEE","DUK","SO","D","O","SPG","MMM","CAT","HON","IBM","TXN"].map((symbol) => ({ symbol, name: symbol, kind: "stock", region: "US" as const }));
export const DIV_ETFS: SicItem[] = ["SCHD","VYM","VIG","DGRO","DVY","HDV","SDY","NOBL","SPYD","SCHY","VYMI","VIGI","IDV","DVYE","DEM","FGD","FDL","FVD","FDVV","DHS","PEY","SPHD","DIV","SDIV","JEPI","JEPQ","QYLD","XYLD","RYLD","DIVO","VNQ","SCHH","IYR","HYG","JNK","LQD","BND","AGG","TIP","EMB","PFF","VUSA","VWRD","VWRL","IWRD","IUSA","LQDE","IHYU","IEMB","VDCP"].map((symbol) => ({ symbol, name: symbol, kind: "etf", region: symbol.length > 4 ? "GLOBAL" as const : "US" as const }));
export const DIVIDEND_SYMBOLS = [...DIV_MX_STOCKS, ...DIV_SIC_STOCKS, ...DIV_ETFS].map((i) => i.symbol);
export function paysDividend(symbol: string): boolean {
  const s = symbol.toUpperCase().replace(/\.MX$/, "");
  return DIVIDEND_SYMBOLS.some((x) => x.toUpperCase().replace(/\.MX$/, "") === s);
}
