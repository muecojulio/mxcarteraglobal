import type { SicItem } from "./sic-types";
import { SIC_UCITSA } from "./sic-ucits-a";
import { SIC_UCITSB } from "./sic-ucits-b";
export const SIC_UCITS: SicItem[] = [...SIC_UCITSA, ...SIC_UCITSB];
