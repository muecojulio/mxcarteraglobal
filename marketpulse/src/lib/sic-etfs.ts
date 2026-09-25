export type { SicItem } from "./sic-types";
export { SIC_ETFS_A as SIC_ETFS_US } from "./sic-etfs-a";
export { SIC_ETFS_B as SIC_ETFS_INTL } from "./sic-etfs-b";
import { SIC_ETFS_A } from "./sic-etfs-a";
import { SIC_ETFS_B } from "./sic-etfs-b";
export const SIC_ETFS = [...SIC_ETFS_A, ...SIC_ETFS_B];
