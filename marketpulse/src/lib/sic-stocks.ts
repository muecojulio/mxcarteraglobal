import type { SicItem } from "./sic-types";
import { SIC_STOCKS_A } from "./sic-stocks-a";
import { SIC_STOCKS_B } from "./sic-stocks-b";

export const SIC_STOCKS: SicItem[] = [...SIC_STOCKS_A, ...SIC_STOCKS_B];
