export type { SicItem } from "./sic-types";
export { SIC_UCITS_A } from "./sic-ucits-a";
export { SIC_UCITS_B } from "./sic-ucits-b";
import { SIC_UCITS_A } from "./sic-ucits-a";
import { SIC_UCITS_B } from "./sic-ucits-b";
export const SIC_UCITS = [...SIC_UCITS_A, ...SIC_UCITS_B];
