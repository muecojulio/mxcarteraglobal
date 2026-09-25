export const PERSIST_KEYS = {
  watchlist: "marketpulse_watchlist",
  positions: "marketpulse_positions",
  alerts: "marketpulse_price_alerts",
  prefs: "mxcg_prefs",
  recentSymbols: "mxcg_recent_symbols",
  lastRoute: "mxcg_last_route",
  theme: "marketpulse_theme",
} as const;
function canUse() { return typeof window !== "undefined" && !!window.localStorage; }
function persistGetJSON<T>(key: string, fallback: T): T {
  if (!canUse()) return fallback;
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}
function persistSetJSON(key: string, value: unknown) {
  if (!canUse()) return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}
function persistGetString(key: string): string | null {
  if (!canUse()) return null;
  try { return localStorage.getItem(key); } catch { return null; }
}
function persistSetString(key: string, value: string) {
  if (!canUse()) return;
  try { localStorage.setItem(key, value); } catch { /* quota */ }
}
export function loadWatchlist(): string[] {
  const v = persistGetJSON<string[]>(PERSIST_KEYS.watchlist, []);
  return Array.isArray(v) ? v.map((s) => String(s).toUpperCase()) : [];
}
export function saveWatchlist(symbols: string[]) {
  persistSetJSON(PERSIST_KEYS.watchlist, [...new Set(symbols.map((s) => s.toUpperCase().trim()).filter(Boolean))]);
}
export type Position = { symbol: string; shares: number; avgCost?: number; [k: string]: unknown };
export function loadPositions(): Position[] {
  const v = persistGetJSON<Position[]>(PERSIST_KEYS.positions, []);
  return Array.isArray(v) ? v : [];
}
export function savePositions(positions: Position[]) { persistSetJSON(PERSIST_KEYS.positions, positions); }
export type PriceAlert = { id?: string; symbol: string; target: number; direction?: string; [k: string]: unknown };
export function loadAlerts(): PriceAlert[] {
  const v = persistGetJSON<PriceAlert[]>(PERSIST_KEYS.alerts, []);
  return Array.isArray(v) ? v : [];
}
export function saveAlerts(alerts: PriceAlert[]) { persistSetJSON(PERSIST_KEYS.alerts, alerts); }
export type AppPrefs = { displayCurrency?: "MXN" | "USD"; compactNumbers?: boolean };
export function loadPrefs(): AppPrefs { return persistGetJSON<AppPrefs>(PERSIST_KEYS.prefs, { displayCurrency: "MXN" }); }
export function savePrefs(prefs: AppPrefs) { persistSetJSON(PERSIST_KEYS.prefs, { ...loadPrefs(), ...prefs }); }
export function pushRecentSymbol(symbol: string, max = 20) {
  const s = symbol.toUpperCase().trim(); if (!s) return;
  const prev = persistGetJSON<string[]>(PERSIST_KEYS.recentSymbols, []);
  persistSetJSON(PERSIST_KEYS.recentSymbols, [s, ...prev.filter((x) => x !== s)].slice(0, max));
}
export function loadRecentSymbols(): string[] { return persistGetJSON<string[]>(PERSIST_KEYS.recentSymbols, []); }
export function saveLastRoute(path: string) { if (!path || path.startsWith("/legal")) return; persistSetString(PERSIST_KEYS.lastRoute, path); }
export function loadLastRoute(): string | null { return persistGetString(PERSIST_KEYS.lastRoute); }
export function persistSummary(): { key: string; label: string; items: number | string }[] {
  return [
    { key: PERSIST_KEYS.watchlist, label: "Watchlist", items: loadWatchlist().length },
    { key: PERSIST_KEYS.positions, label: "Posiciones cartera", items: loadPositions().length },
    { key: PERSIST_KEYS.alerts, label: "Alertas", items: loadAlerts().length },
    { key: PERSIST_KEYS.recentSymbols, label: "Vistos recientemente", items: loadRecentSymbols().length },
    { key: PERSIST_KEYS.theme, label: "Tema", items: persistGetString(PERSIST_KEYS.theme) || "sistema" },
  ];
}
