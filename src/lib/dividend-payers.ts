/**
 * Listas de instrumentos que suelen DISTRIBUIR dividendos/distribuciones.
 * Criterio: historial habitual de pago + liquidez relativa en BMV/BIVA/SIC.
 * No es promesa de pago futuro.
 */

import type { SicItem } from "./sic-catalog";

type MxDiv = {
  symbol: string;
  name: string;
  kind: "stock" | "etf" | "fibra" | "bond_etf";
  venue: "BMV" | "BIVA" | "SIC" | "BMV/BIVA";
};

/** 50 acciones BMV/BIVA con historial de dividendo */
export const DIV_MX_STOCKS: MxDiv[] = [
  { symbol: "GFNORTEO.MX", name: "Banorte · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "BBAJIOO.MX", name: "Banco del Bajío · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "RA.MX", name: "Regional · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "GFREGIOO.MX", name: "Banregio · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "Q.MX", name: "Qualitas · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "GPROFUT.MX", name: "Profuturo · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "GNP.MX", name: "GNP · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "GMEXICOB.MX", name: "Grupo México · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "AMXL.MX", name: "América Móvil · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "AMXB.MX", name: "América Móvil B · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "WALMEX.MX", name: "Walmart México · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "FEMSAUBD.MX", name: "FEMSA · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "KOFUBL.MX", name: "Coca-Cola FEMSA · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "AC.MX", name: "Arca Continental · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "KIMBERA.MX", name: "Kimberly-Clark MX · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "ASURB.MX", name: "ASUR · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "GAPB.MX", name: "GAP · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "OMAB.MX", name: "OMA · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "BOLSAA.MX", name: "BMV · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "PINFRA.MX", name: "PINFRA · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "MEGACPO.MX", name: "Megacable · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "ORBIA.MX", name: "Orbia · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "BIMBOA.MX", name: "Bimbo · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "GRUMAB.MX", name: "Gruma · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "LABB.MX", name: "Genomma Lab · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "GENTERA.MX", name: "Gentera · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "VESTA.MX", name: "Vesta · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "LIVEPOLC-1.MX", name: "Liverpool · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "CHDRAUIB.MX", name: "Chedraui · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "SORIANAB.MX", name: "Soriana · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "GCARSOA1.MX", name: "Grupo Carso · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "GCC.MX", name: "GCC · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "CMOCTEZ.MX", name: "Moctezuma · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "LAMOSA.MX", name: "Lamosa · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "GISSAA.MX", name: "GIS · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "HERDEZ.MX", name: "Herdez · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "BACHOCOB.MX", name: "Bachoco · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "CUERVO.MX", name: "Becle · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "ALSEA.MX", name: "Alsea · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "CEMEXCPO.MX", name: "Cemex · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "ALPEKA.MX", name: "Alpek · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "ICHB.MX", name: "Industrias CH · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "KUO.MX", name: "KUO · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "SIMECB.MX", name: "Simec · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "FRAGUAB.MX", name: "Fragua · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "MEDICA.MX", name: "Médica Sur · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "VINTE.MX", name: "Vinte · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "ACTINVRB.MX", name: "Actinver · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "INVEXA.MX", name: "Invex · dividendo", kind: "stock", venue: "BMV/BIVA" },
  { symbol: "AGUA.MX", name: "Rotoplas · dividendo", kind: "stock", venue: "BMV/BIVA" },
];

/** 50 acciones SIC con dividendo habitual (aristócratas / blue chips) */
export const DIV_SIC_STOCKS: SicItem[] = [
  { symbol: "JNJ", name: "Johnson & Johnson · div", kind: "stock", region: "US" },
  { symbol: "PG", name: "Procter & Gamble · div", kind: "stock", region: "US" },
  { symbol: "KO", name: "Coca-Cola · div", kind: "stock", region: "US" },
  { symbol: "PEP", name: "PepsiCo · div", kind: "stock", region: "US" },
  { symbol: "MCD", name: "McDonald's · div", kind: "stock", region: "US" },
  { symbol: "WMT", name: "Walmart · div", kind: "stock", region: "US" },
  { symbol: "HD", name: "Home Depot · div", kind: "stock", region: "US" },
  { symbol: "LOW", name: "Lowe's · div", kind: "stock", region: "US" },
  { symbol: "TGT", name: "Target · div", kind: "stock", region: "US" },
  { symbol: "COST", name: "Costco · div", kind: "stock", region: "US" },
  { symbol: "CL", name: "Colgate-Palmolive · div", kind: "stock", region: "US" },
  { symbol: "KMB", name: "Kimberly-Clark · div", kind: "stock", region: "US" },
  { symbol: "GIS", name: "General Mills · div", kind: "stock", region: "US" },
  { symbol: "KHC", name: "Kraft Heinz · div", kind: "stock", region: "US" },
  { symbol: "MO", name: "Altria · div", kind: "stock", region: "US" },
  { symbol: "PM", name: "Philip Morris · div", kind: "stock", region: "US" },
  { symbol: "XOM", name: "Exxon Mobil · div", kind: "stock", region: "US" },
  { symbol: "CVX", name: "Chevron · div", kind: "stock", region: "US" },
  { symbol: "COP", name: "ConocoPhillips · div", kind: "stock", region: "US" },
  { symbol: "JPM", name: "JPMorgan · div", kind: "stock", region: "US" },
  { symbol: "BAC", name: "Bank of America · div", kind: "stock", region: "US" },
  { symbol: "WFC", name: "Wells Fargo · div", kind: "stock", region: "US" },
  { symbol: "C", name: "Citigroup · div", kind: "stock", region: "US" },
  { symbol: "MS", name: "Morgan Stanley · div", kind: "stock", region: "US" },
  { symbol: "GS", name: "Goldman Sachs · div", kind: "stock", region: "US" },
  { symbol: "BLK", name: "BlackRock · div", kind: "stock", region: "US" },
  { symbol: "V", name: "Visa · div", kind: "stock", region: "US" },
  { symbol: "MA", name: "Mastercard · div", kind: "stock", region: "US" },
  { symbol: "AXP", name: "American Express · div", kind: "stock", region: "US" },
  { symbol: "ABBV", name: "AbbVie · div", kind: "stock", region: "US" },
  { symbol: "MRK", name: "Merck · div", kind: "stock", region: "US" },
  { symbol: "PFE", name: "Pfizer · div", kind: "stock", region: "US" },
  { symbol: "LLY", name: "Eli Lilly · div", kind: "stock", region: "US" },
  { symbol: "AMGN", name: "Amgen · div", kind: "stock", region: "US" },
  { symbol: "ABT", name: "Abbott · div", kind: "stock", region: "US" },
  { symbol: "MDT", name: "Medtronic · div", kind: "stock", region: "US" },
  { symbol: "UNH", name: "UnitedHealth · div", kind: "stock", region: "US" },
  { symbol: "T", name: "AT&T · div", kind: "stock", region: "US" },
  { symbol: "VZ", name: "Verizon · div", kind: "stock", region: "US" },
  { symbol: "NEE", name: "NextEra Energy · div", kind: "stock", region: "US" },
  { symbol: "DUK", name: "Duke Energy · div", kind: "stock", region: "US" },
  { symbol: "SO", name: "Southern Company · div", kind: "stock", region: "US" },
  { symbol: "D", name: "Dominion Energy · div", kind: "stock", region: "US" },
  { symbol: "O", name: "Realty Income · div", kind: "stock", region: "US" },
  { symbol: "SPG", name: "Simon Property · div", kind: "stock", region: "US" },
  { symbol: "MMM", name: "3M · div", kind: "stock", region: "US" },
  { symbol: "CAT", name: "Caterpillar · div", kind: "stock", region: "US" },
  { symbol: "HON", name: "Honeywell · div", kind: "stock", region: "US" },
  { symbol: "IBM", name: "IBM · div", kind: "stock", region: "US" },
  { symbol: "TXN", name: "Texas Instruments · div", kind: "stock", region: "US" },
];

/** 50 ETFs que distribuyen (US/SIC + UCITS Dist, no acumulación pura) */
export const DIV_ETFS: SicItem[] = [
  { symbol: "SCHD", name: "Schwab US Dividend · dist", kind: "etf", region: "US" },
  { symbol: "VYM", name: "Vanguard High Dividend Yield · dist", kind: "etf", region: "US" },
  { symbol: "VIG", name: "Vanguard Dividend Appreciation · dist", kind: "etf", region: "US" },
  { symbol: "DGRO", name: "iShares Core Dividend Growth · dist", kind: "etf", region: "US" },
  { symbol: "DVY", name: "iShares Select Dividend · dist", kind: "etf", region: "US" },
  { symbol: "HDV", name: "iShares Core High Dividend · dist", kind: "etf", region: "US" },
  { symbol: "SDY", name: "SPDR S&P Dividend · dist", kind: "etf", region: "US" },
  { symbol: "NOBL", name: "ProShares Dividend Aristocrats · dist", kind: "etf", region: "US" },
  { symbol: "SPYD", name: "SPDR S&P 500 High Dividend · dist", kind: "etf", region: "US" },
  { symbol: "SCHY", name: "Schwab Intl Dividend · dist", kind: "etf", region: "GLOBAL" },
  { symbol: "VYMI", name: "Vanguard Intl High Dividend · dist", kind: "etf", region: "GLOBAL" },
  { symbol: "VIGI", name: "Vanguard Intl Div Appreciation · dist", kind: "etf", region: "GLOBAL" },
  { symbol: "IDV", name: "iShares International Select Div · dist", kind: "etf", region: "GLOBAL" },
  { symbol: "DVYE", name: "iShares EM Dividend · dist", kind: "etf", region: "GLOBAL" },
  { symbol: "DEM", name: "WisdomTree EM High Dividend · dist", kind: "etf", region: "GLOBAL" },
  { symbol: "FGD", name: "First Trust Global Select Div · dist", kind: "etf", region: "GLOBAL" },
  { symbol: "FDL", name: "First Trust Dividend Leaders · dist", kind: "etf", region: "US" },
  { symbol: "FVD", name: "First Trust Value Line Dividend · dist", kind: "etf", region: "US" },
  { symbol: "FDVV", name: "Fidelity High Dividend · dist", kind: "etf", region: "US" },
  { symbol: "DHS", name: "WisdomTree US High Dividend · dist", kind: "etf", region: "US" },
  { symbol: "PEY", name: "Invesco High Yield Equity Dividend · dist", kind: "etf", region: "US" },
  { symbol: "SPHD", name: "Invesco S&P 500 High Div Low Vol · dist", kind: "etf", region: "US" },
  { symbol: "DIV", name: "Global X SuperDividend · dist", kind: "etf", region: "US" },
  { symbol: "SDIV", name: "Global X SuperDividend · dist", kind: "etf", region: "GLOBAL" },
  { symbol: "JEPI", name: "JPMorgan Equity Premium Income · dist", kind: "etf", region: "US" },
  { symbol: "JEPQ", name: "JPMorgan Nasdaq Premium Income · dist", kind: "etf", region: "US" },
  { symbol: "QYLD", name: "Global X Nasdaq 100 Covered Call · dist", kind: "etf", region: "US" },
  { symbol: "XYLD", name: "Global X S&P 500 Covered Call · dist", kind: "etf", region: "US" },
  { symbol: "RYLD", name: "Global X Russell 2000 Covered Call · dist", kind: "etf", region: "US" },
  { symbol: "DIVO", name: "Amplify CWP Enhanced Dividend · dist", kind: "etf", region: "US" },
  { symbol: "VNQ", name: "Vanguard Real Estate · dist", kind: "etf", region: "US" },
  { symbol: "SCHH", name: "Schwab US REIT · dist", kind: "etf", region: "US" },
  { symbol: "IYR", name: "iShares US Real Estate · dist", kind: "etf", region: "US" },
  { symbol: "HYG", name: "iShares High Yield Corp · dist", kind: "etf", region: "US" },
  { symbol: "JNK", name: "SPDR High Yield Bond · dist", kind: "etf", region: "US" },
  { symbol: "LQD", name: "iShares IG Corporate Bond · dist", kind: "etf", region: "US" },
  { symbol: "BND", name: "Vanguard Total Bond · dist", kind: "etf", region: "US" },
  { symbol: "AGG", name: "iShares Aggregate Bond · dist", kind: "etf", region: "US" },
  { symbol: "TIP", name: "iShares TIPS · dist", kind: "etf", region: "US" },
  { symbol: "EMB", name: "iShares EM Bond · dist", kind: "etf", region: "US" },
  { symbol: "PFF", name: "iShares Preferred · dist", kind: "etf", region: "US" },
  { symbol: "VUSA", name: "Vanguard S&P 500 UCITS Dist", kind: "etf", region: "GLOBAL" },
  { symbol: "VWRD", name: "Vanguard FTSE All-World UCITS Dist", kind: "etf", region: "GLOBAL" },
  { symbol: "VWRL", name: "Vanguard FTSE All-World UCITS Dist GBP", kind: "etf", region: "GLOBAL" },
  { symbol: "IWRD", name: "iShares MSCI World UCITS Dist", kind: "etf", region: "GLOBAL" },
  { symbol: "IUSA", name: "iShares S&P 500 UCITS Dist", kind: "etf", region: "GLOBAL" },
  { symbol: "LQDE", name: "iShares $ Corp Bond UCITS Dist", kind: "etf", region: "GLOBAL" },
  { symbol: "IHYU", name: "iShares $ High Yield Corp UCITS Dist", kind: "etf", region: "GLOBAL" },
  { symbol: "IEMB", name: "iShares JPM $ EM Bond UCITS Dist", kind: "etf", region: "GLOBAL" },
  { symbol: "VDCP", name: "Vanguard USD Corporate Bond UCITS Dist", kind: "etf", region: "GLOBAL" },
];

export const DIVIDEND_SYMBOLS = new Set(
  [
    ...DIV_MX_STOCKS.map((i) => i.symbol.toUpperCase().replace(/\.MX$/, "")),
    ...DIV_SIC_STOCKS.map((i) => i.symbol.toUpperCase()),
    ...DIV_ETFS.map((i) => i.symbol.toUpperCase()),
  ]
);

export function paysDividend(symbol: string): boolean {
  const s = symbol.toUpperCase().replace(/\.MX$/, "");
  if (DIVIDEND_SYMBOLS.has(s) || DIVIDEND_SYMBOLS.has(symbol.toUpperCase())) {
    return true;
  }
  // FIBRAs mexicanas deben distribuir ~95% del resultado fiscal
  if (
    s.startsWith("FUNO") ||
    s.startsWith("FIBRA") ||
    s.startsWith("DANHOS") ||
    s.startsWith("FMTY") ||
    s.startsWith("TERRA") ||
    s.startsWith("FSHOP") ||
    s.startsWith("FHIPO") ||
    s.startsWith("FNOVA") ||
    s.startsWith("FIHO") ||
    s.startsWith("EDUCA") ||
    s.startsWith("STORAGE") ||
    s.startsWith("FINN") ||
    s.startsWith("FPLUS") ||
    s.startsWith("FCFE") ||
    s.startsWith("FEXI") ||
    s.startsWith("NEXT")
  ) {
    return true;
  }
  return false;
}
