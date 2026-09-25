export type SicKind = "stock" | "etf";

export type SicItem = {
  symbol: string;
  name: string;
  kind: SicKind;
  region: "US" | "EU" | "ASIA" | "LATAM" | "GLOBAL";
};
