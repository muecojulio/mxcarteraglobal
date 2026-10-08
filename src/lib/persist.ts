/**
 * Almacenamiento persistente unificado (este dispositivo).
 * Todas las claves de usuario pasan por aquí.
 */

export const PERSIST_KEYS = {
  watchlist: "marketpulse_watchlist",
  positions: "marketpulse_positions",
  alerts: "marketpulse_price_alerts",
  theme: "marketpulse_theme",
  goal: "marketpulse_goal",
  projection: "marketpulse_projection",
  divGoal: "marketpulse_div_goal",
  divProj: "marketpulse_div_proj",
  recentSymbols: "mxcg_recent_symbols",
  lastRoute: "mxcg_last_route",
  prefs: "mxcg_prefs",
} as const;

export type PersistKey = (typeof PERSIST_KEYS)[keyof typeof PERSIST_KEYS];

const SENSITIVE = new Set<string>([
  PERSIST_KEYS.watchlist,
  PERSIST_KEYS.positions,
  PERSIST_KEYS.alerts,
  PERSIST_KEYS.goal,
  PERSIST_KEYS.projection,
  PERSIST_KEYS.divGoal,
  PERSIST_KEYS.divProj,
  PERSIST_KEYS.recentSymbols,
  PERSIST_KEYS.prefs,
]);

const mem = new Map<string, string>();

function canUse(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function persistGetString(key: string): string | null {
  if (mem.has(key)) return mem.get(key) ?? null;
  if (!canUse()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    if (raw.startsWith("ENC1.")) {
      // aún no hidratado: no devolver cifrado como si fuera JSON
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

export function persistSetString(key: string, value: string): void {
  mem.set(key, value);
  if (!canUse()) return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* cuota llena */
  }
  if (SENSITIVE.has(key)) {
    void flushEncrypted(key, value);
  }
}

async function flushEncrypted(key: string, value: string) {
  try {
    const { getSessionMasterKey, encryptText, ensureDeviceVault } =
      await import("./crypto-vault");
    let mk = getSessionMasterKey();
    if (!mk) mk = await ensureDeviceVault();
    const blob = await encryptText(value, mk);
    localStorage.setItem(key, blob);
  } catch {
    /* si el cifrado falla, queda el texto que ya se escribió */
  }
}

/** Descifra claves sensibles a memoria (llamar al desbloquear). */
export async function hydrateVaultPersist(): Promise<void> {
  if (!canUse()) return;
  const { getSessionMasterKey, decryptText, isEncryptedBlob, ensureDeviceVault } =
    await import("./crypto-vault");
  let mk = getSessionMasterKey();
  if (!mk) {
    try {
      mk = await ensureDeviceVault();
    } catch {
      return;
    }
  }
  for (const key of SENSITIVE) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      if (isEncryptedBlob(raw)) {
        const pt = await decryptText(raw, mk);
        mem.set(key, pt);
      } else {
        mem.set(key, raw);
        void flushEncrypted(key, raw);
      }
    } catch {
      /* blob de otra clave: dejar */
    }
  }
}

export function collectSyncPayload(): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const key of Object.values(PERSIST_KEYS)) {
    out[key] = persistGetString(key);
  }
  return out;
}

export function applySyncPayload(data: Record<string, string | null | undefined>) {
  for (const [key, value] of Object.entries(data)) {
    if (value == null || value === "") continue;
    persistSetString(key, value);
  }
}

export function persistRemove(key: string): void {
  if (!canUse()) return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* */
  }
}

export function persistGetJSON<T>(key: string, fallback: T): T {
  const raw = persistGetString(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function persistSetJSON(key: string, value: unknown): void {
  try {
    persistSetString(key, JSON.stringify(value));
  } catch {
    /* */
  }
}

/** Watchlist de símbolos */
export function loadWatchlist(): string[] {
  const v = persistGetJSON<string[]>(PERSIST_KEYS.watchlist, []);
  return Array.isArray(v) ? v.map((s) => String(s).toUpperCase()) : [];
}

export function saveWatchlist(symbols: string[]): void {
  const uniq = [...new Set(symbols.map((s) => s.toUpperCase().trim()).filter(Boolean))];
  persistSetJSON(PERSIST_KEYS.watchlist, uniq);
}

/**
 * Posición de cartera tal como se guarda en `marketpulse_positions`.
 *
 * Antes este tipo declaraba `shares`, un campo que ninguna parte del código
 * escribe ni lee (la app usa `quantity` en 21 sitios). Esa divergencia obligaba
 * a `portfolio/page.tsx` a hacer `as any` al cargar y al guardar. Este tipo es
 * ahora la única definición y las páginas la importan.
 */
export type Position = {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  avgCost: number;
  region: "MX" | "US";
  /** BMV / NASDAQ / etc. Opcional: las posiciones antiguas pueden no traerlo. */
  market?: string;
  currency: "MXN" | "USD";
};

export function loadPositions(): Position[] {
  const v = persistGetJSON<Position[]>(PERSIST_KEYS.positions, []);
  return Array.isArray(v) ? v : [];
}

export function savePositions(positions: Position[]): void {
  persistSetJSON(PERSIST_KEYS.positions, positions);
}

export type PriceAlert = {
  id?: string;
  symbol: string;
  target: number;
  direction?: string;
  [k: string]: unknown;
};

export function loadAlerts(): PriceAlert[] {
  const v = persistGetJSON<PriceAlert[]>(PERSIST_KEYS.alerts, []);
  return Array.isArray(v) ? v : [];
}

export function saveAlerts(alerts: PriceAlert[]): void {
  persistSetJSON(PERSIST_KEYS.alerts, alerts);
}

/** Últimos tickers visitados (ficha) */
export function pushRecentSymbol(symbol: string, max = 20): void {
  const s = symbol.toUpperCase().trim();
  if (!s) return;
  const prev = persistGetJSON<string[]>(PERSIST_KEYS.recentSymbols, []);
  const next = [s, ...prev.filter((x) => x !== s)].slice(0, max);
  persistSetJSON(PERSIST_KEYS.recentSymbols, next);
}

export function loadRecentSymbols(): string[] {
  return persistGetJSON<string[]>(PERSIST_KEYS.recentSymbols, []);
}

export type AppPrefs = {
  displayCurrency?: "MXN" | "USD";
  compactNumbers?: boolean;
};

export function loadPrefs(): AppPrefs {
  return persistGetJSON<AppPrefs>(PERSIST_KEYS.prefs, { displayCurrency: "MXN" });
}

export function savePrefs(prefs: AppPrefs): void {
  persistSetJSON(PERSIST_KEYS.prefs, { ...loadPrefs(), ...prefs });
}

export function saveLastRoute(path: string): void {
  if (!path || path.startsWith("/legal")) return;
  persistSetString(PERSIST_KEYS.lastRoute, path);
}

export function loadLastRoute(): string | null {
  return persistGetString(PERSIST_KEYS.lastRoute);
}

/** Resumen de qué hay guardado (Configuración) */
export function persistSummary(): {
  key: string;
  label: string;
  items: number | string;
}[] {
  const wl = loadWatchlist().length;
  const pos = loadPositions().length;
  const al = loadAlerts().length;
  const recent = loadRecentSymbols().length;
  return [
    { key: PERSIST_KEYS.watchlist, label: "Watchlist", items: wl },
    { key: PERSIST_KEYS.positions, label: "Posiciones cartera", items: pos },
    { key: PERSIST_KEYS.alerts, label: "Alertas", items: al },
    { key: PERSIST_KEYS.recentSymbols, label: "Vistos recientemente", items: recent },
    {
      key: PERSIST_KEYS.theme,
      label: "Tema",
      items: persistGetString(PERSIST_KEYS.theme) || "sistema",
    },
  ];
}
