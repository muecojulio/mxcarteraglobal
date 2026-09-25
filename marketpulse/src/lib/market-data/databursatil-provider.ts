import type { MarketDataProvider, Quote, SearchResult, IndexQuote } from "./types";

const BASE = "https://api.databursatil.com";
const SYMBOL_MAP: Record<string, string> = {
  "AMXL.MX": "AMXB", "AMX.MX": "AMXB", AMXL: "AMXB", AMXB: "AMXB",
  "WALMEX.MX": "WALMEX*", WALMEX: "WALMEX*",
  "GFNORTEO.MX": "GFNORTEO", GFNORTEO: "GFNORTEO",
  "FEMSAUBD.MX": "FEMSAUBD", FEMSAUBD: "FEMSAUBD",
  "BIMBOA.MX": "BIMBOA", BIMBOA: "BIMBOA",
  "CEMEXCPO.MX": "CEMEXCPO", CEMEXCPO: "CEMEXCPO",
  "GMEXICOB.MX": "GMEXICOB", GMEXICOB: "GMEXICOB",
  "TLEVISACPO.MX": "TLEVISACPO", TLEVISACPO: "TLEVISACPO",
  "GCARSOA1.MX": "GCARSOA1", "ALSEA.MX": "ALSEA*", ALSEA: "ALSEA*",
  "KIMBERA.MX": "KIMBERA", "PE&OLES.MX": "PENOLES*", "PENOLES.MX": "PENOLES*",
};
const NAME_MAP: Record<string, string> = {
  AMXB: "América Móvil", "WALMEX*": "Walmart de México", GFNORTEO: "Grupo Financiero Banorte",
  FEMSAUBD: "FEMSA", BIMBOA: "Grupo Bimbo", CEMEXCPO: "Cemex", GMEXICOB: "Grupo México",
  TLEVISACPO: "Televisa", GCARSOA1: "Grupo Carso", "ALSEA*": "Alsea",
  KIMBERA: "Kimberly-Clark de México", "PENOLES*": "Peñoles",
};
function toDbSymbol(symbol: string): string {
  const s = symbol.toUpperCase().replace(/\.MX$/, "");
  return SYMBOL_MAP[symbol.toUpperCase()] || SYMBOL_MAP[s] || s;
}
function toAppSymbol(dbSymbol: string): string {
  const entry = Object.entries(SYMBOL_MAP).find(([k, v]) => v === dbSymbol && k.endsWith(".MX"));
  return entry ? entry[0] : dbSymbol.replace(/\*$/, "") + ".MX";
}
function detectLikelyMx(symbol: string): boolean {
  const s = symbol.toUpperCase();
  return ["AMX", "WALMEX", "GFNORTE", "FEMSA", "BIMBO", "CEMEX", "GMEXICO", "TLEVISA", "ALSEA", "KIMBER"].some((p) => s.startsWith(p));
}

export class DataBursatilProvider implements MarketDataProvider {
  name = "databursatil";
  private token: string;
  constructor(token: string) { this.token = token; }
  private async fetchJson<T>(path: string, params: Record<string, string>): Promise<T | null> {
    const url = new URL(`${BASE}${path}`);
    url.searchParams.set("token", this.token);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    try {
      const res = await fetch(url.toString(), { next: { revalidate: 60 } });
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.Error || data?.error) return null;
      return data as T;
    } catch { return null; }
  }
  async getQuote(symbol: string): Promise<Quote | null> {
    const dbSym = toDbSymbol(symbol);
    const data = await this.fetchJson<Record<string, { bmv?: Record<string, number | string> }>>("/v2/cotizaciones", { concepto: "u,a,c,m,v", emisora_serie: dbSym, bolsa: "BMV" });
    if (!data) return null;
    const key = Object.keys(data).find((k) => k.toUpperCase() === dbSym.toUpperCase()) || Object.keys(data)[0];
    const row = key ? data[key]?.bmv : null;
    if (!row || row.u == null) return null;
    const price = Number(row.u); const prev = Number(row.a ?? price);
    return { symbol: toAppSymbol(dbSym), name: NAME_MAP[dbSym] || key || dbSym, price, change: Number(row.m ?? price - prev), changePercent: Number(row.c ?? 0), previousClose: prev, volume: row.v != null ? Number(row.v) : undefined, currency: "MXN", region: "MX", market: "BMV", exchange: "BMV", updatedAt: new Date().toISOString(), source: "databursatil" };
  }
  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const mx = symbols.filter((s) => s.toUpperCase().endsWith(".MX") || SYMBOL_MAP[s.toUpperCase()] || detectLikelyMx(s));
    if (!mx.length) return [];
    const out: Quote[] = [];
    for (const s of mx.slice(0, 20)) { const q = await this.getQuote(s); if (q) out.push(q); }
    return out;
  }
  async search(query: string): Promise<SearchResult[]> {
    const data = await this.fetchJson<Record<string, Record<string, { razon_social?: string; bolsa?: string; estatus?: string }>>>("/v2/emisoras", { letra: query.slice(0, 10), mercado: "local" });
    if (!data) return [];
    const results: SearchResult[] = [];
    for (const [emisora, series] of Object.entries(data)) {
      for (const [serie, info] of Object.entries(series)) {
        if (info.estatus === "SUSPENDIDA") continue;
        const dbSym = serie === "*" || !serie ? emisora + "*" : emisora + serie;
        results.push({ symbol: toAppSymbol(dbSym), name: info.razon_social || emisora, exchange: info.bolsa || "BMV", region: "MX", currency: "MXN" });
      }
    }
    return results.slice(0, 15);
  }
  async getIndices(): Promise<IndexQuote[]> { return []; }
  async getDividends(symbol: string) {
    const dbSym = toDbSymbol(symbol);
    const letra = dbSym.replace(/\*$/, "").slice(0, 6);
    const data = await this.fetchJson<Record<string, Record<string, { dividendos?: { historico?: Record<string, { pago: number; tipo?: string; divisa?: string }>; reciente?: Record<string, { pago: number; tipo?: string; divisa?: string; fechaexcupon?: string }> } }>>>("/v2/emisoras", { letra, mercado: "local" });
    if (!data) return [];
    const events: Array<{ date: string; amount: number; currency?: string; exDate?: string }> = [];
    for (const series of Object.values(data)) {
      for (const info of Object.values(series)) {
        const div = info.dividendos; if (!div) continue;
        if (div.historico) for (const [date, d] of Object.entries(div.historico)) events.push({ date, amount: d.pago, currency: d.divisa || "MXN" });
        if (div.reciente) for (const [date, d] of Object.entries(div.reciente)) events.push({ date, amount: d.pago, currency: d.divisa || "MXN", exDate: d.fechaexcupon });
      }
    }
    const seen = new Set<string>();
    return events.filter((e) => { if (seen.has(e.date)) return false; seen.add(e.date); return true; }).sort((a, b) => b.date.localeCompare(a.date));
  }
}
export { DataBursatilProvider as DatabursatilProvider };
