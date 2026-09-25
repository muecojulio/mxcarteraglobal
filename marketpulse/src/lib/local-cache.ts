const PREFIX = "mxcg_cache_v1:";
const MEM = new Map<string, { exp: number; data: unknown }>();
const DEFAULT_MAX_ENTRIES = 80;
function now() { return Date.now(); }
function lsGet<T>(key: string): { exp: number; data: T } | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as { exp: number; data: T };
  } catch { return null; }
}
function lsSet(key: string, exp: number, data: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ exp, data }));
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) keys.push(k);
    }
    if (keys.length > DEFAULT_MAX_ENTRIES) {
      const scored = keys.map((k) => {
        try { return { k, exp: Number(JSON.parse(localStorage.getItem(k) || "{}").exp) || 0 }; }
        catch { return { k, exp: 0 }; }
      });
      scored.sort((a, b) => a.exp - b.exp);
      for (let i = 0; i < scored.length - DEFAULT_MAX_ENTRIES; i++) localStorage.removeItem(scored[i].k);
    }
  } catch { /* quota */ }
}
export function cacheGet<T>(key: string): T | null {
  const m = MEM.get(key);
  if (m && m.exp > now()) return m.data as T;
  if (m) MEM.delete(key);
  if (typeof window === "undefined") return null;
  const s = lsGet<T>(key);
  if (!s) return null;
  if (s.exp <= now()) { try { localStorage.removeItem(PREFIX + key); } catch { /* */ } return null; }
  MEM.set(key, s);
  return s.data;
}
export function cacheSet(key: string, data: unknown, ttlMs: number) {
  const exp = now() + Math.max(1_000, ttlMs);
  MEM.set(key, { exp, data });
  if (typeof window !== "undefined") lsSet(key, exp, data);
}
export function cacheGetStale<T>(key: string): T | null {
  const m = MEM.get(key);
  if (m) return m.data as T;
  if (typeof window === "undefined") return null;
  return lsGet<T>(key)?.data ?? null;
}
export function cacheRemove(key: string) {
  MEM.delete(key);
  try { localStorage.removeItem(PREFIX + key); } catch { /* */ }
}
export const CACHE_TTL = {
  quotes: 45_000,
  indices: 60_000,
  fx: 5 * 60_000,
  search: 10 * 60_000,
  dividends: 30 * 60_000,
  asset: 2 * 60_000,
} as const;
