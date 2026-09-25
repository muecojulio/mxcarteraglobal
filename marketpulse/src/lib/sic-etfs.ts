import type { SicItem } from "./sic-types";
import { SIC_ETFSA } from "./sic-etfs-a";
import { SIC_ETFSB } from "./sic-etfs-b";
export const SIC_ETFS: SicItem[] = [...SIC_ETFSA, ...SIC_ETFSB];
