/**
 * Catálogo SIC / Mercado Global BMV.
 * Partido en módulos para no saturar un solo archivo.
 */
export type { SicKind, SicItem } from "./sic-types";
export { SIC_STOCKS } from "./sic-stocks";
export { SIC_ETFS } from "./sic-etfs";
export { SIC_UCITS } from "./sic-ucits";

import type { SicKind, SicItem } from "./sic-types";
import { SIC_STOCKS } from "./sic-stocks";
import { SIC_ETFS } from "./sic-etfs";
import { SIC_UCITS } from "./sic-ucits";

export const SIC_ALL: SicItem[] = [...SIC_STOCKS, ...SIC_ETFS, ...SIC_UCITS];

export function searchSic(q: string, kind?: SicKind | "ALL" | "ucits"): SicItem[] {
  const needle = q.trim().toUpperCase();
  const pool =
    kind === "stock"
      ? SIC_STOCKS
      : kind === "etf"
      ? [...SIC_ETFS, ...SIC_UCITS]
      : kind === "ucits"
      ? SIC_UCITS
      : SIC_ALL;
  if (!needle) return pool;
  return pool.filter(
    (i) =>
      i.symbol.toUpperCase().includes(needle) ||
      i.name.toUpperCase().includes(needle)
  );
}

export function isSicSymbol(symbol: string): boolean {
  const s = symbol.toUpperCase().replace(/\.MX$/, "");
  return SIC_ALL.some((i) => i.symbol.toUpperCase() === s);
}
