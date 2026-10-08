/**
 * Caché HTTP de las rutas `/api/*`.
 *
 * Una sola fuente de verdad: antes cada ruta escribía su `Cache-Control` a mano
 * y 15 de 20 no lo enviaban, así que el navegador usaba heurísticas y el edge de
 * Vercel no cacheaba nada. Aquí la política vive en una tabla por ruta y se
 * aplica con `jsonInit()`.
 *
 * Reglas:
 * - Solo las respuestas 200 son cacheables. Un 4xx/5xx siempre sale como
 *   `private, no-store` para no fijar un error en el CDN.
 * - Todo lo que dependa del usuario (respaldos cifrados, tokens) es `private,
 *   no-store` aunque el resto de la ruta sea pública.
 * - Rutas desconocidas caen en `private, no-store` (fallo seguro).
 *
 * `s-maxage` lo consume el edge de Vercel; `stale-while-revalidate` permite
 * seguir sirviendo el dato viejo mientras se recalcula, que es justo lo que la
 * app quiere cuando una fuente pública tarda o falla.
 */

export type CachePolicy =
  | { kind: "public"; sMaxAge: number; swr: number }
  | { kind: "private" };

const PRIVATE: CachePolicy = { kind: "private" };

/** Segundos. Elegidos según qué tan rápido cambia cada dato. */
const POLICIES: Record<string, CachePolicy> = {
  // Cotizaciones: cambian todo el tiempo, pero 30 s evita golpear la fuente.
  "/api/quote": { kind: "public", sMaxAge: 30, swr: 120 },
  "/api/quotes": { kind: "public", sMaxAge: 30, swr: 120 },
  "/api/markets": { kind: "public", sMaxAge: 60, swr: 300 },
  "/api/indices": { kind: "public", sMaxAge: 60, swr: 300 },
  "/api/screener": { kind: "public", sMaxAge: 60, swr: 300 },

  // Datos que cambian lento.
  "/api/fx": { kind: "public", sMaxAge: 300, swr: 1800 },
  "/api/search": { kind: "public", sMaxAge: 300, swr: 900 },
  "/api/asset": { kind: "public", sMaxAge: 300, swr: 1800 },
  "/api/public-finance": { kind: "public", sMaxAge: 300, swr: 1800 },
  "/api/portfolio-history": { kind: "public", sMaxAge: 300, swr: 1800 },

  // Calendarios y dividendos: diarios.
  "/api/calendar": { kind: "public", sMaxAge: 1800, swr: 3600 },
  "/api/ipo": { kind: "public", sMaxAge: 1800, swr: 3600 },
  "/api/dividends": { kind: "public", sMaxAge: 1800, swr: 3600 },
  "/api/portfolio-dividends": { kind: "public", sMaxAge: 1800, swr: 3600 },
  "/api/portfolio-events": { kind: "public", sMaxAge: 1800, swr: 3600 },

  // Fundamentales y tasas: casi estáticos.
  "/api/analysis": { kind: "public", sMaxAge: 3600, swr: 86400 },
  "/api/metrics": { kind: "public", sMaxAge: 3600, swr: 86400 },
  "/api/risk-free": { kind: "public", sMaxAge: 3600, swr: 7200 },
  "/api/dividend-growth": { kind: "public", sMaxAge: 86400, swr: 172800 },

  // Datos del usuario o secretos: nunca cacheables.
  "/api/sync": PRIVATE,
  "/api/realtime/token": PRIVATE,
};

export function policyFor(pathname: string): CachePolicy {
  return POLICIES[pathname] ?? PRIVATE;
}

/** Cabecera `Cache-Control` efectiva para una ruta y un estado HTTP. */
export function cacheControlFor(pathname: string, status = 200): string {
  const policy = policyFor(pathname);
  if (status !== 200 || policy.kind === "private") {
    return "private, no-store, max-age=0, must-revalidate";
  }
  return `public, s-maxage=${policy.sMaxAge}, stale-while-revalidate=${policy.swr}`;
}

/**
 * Init para `NextResponse.json()` con la política de caché de la ruta.
 * Uso: `NextResponse.json(body, jsonInit("/api/quote"))`
 *      `NextResponse.json(err, jsonInit("/api/quote", { status: 500 }))`
 */
export function jsonInit(
  pathname: string,
  init: { status?: number } = {}
): { status?: number; headers: Record<string, string> } {
  return {
    status: init.status,
    headers: { "Cache-Control": cacheControlFor(pathname, init.status ?? 200) },
  };
}

/**
 * Envuelve un route handler y fija `Cache-Control` según la política de la ruta
 * y el estado real de la respuesta.
 *
 * Se aplica una sola vez por archivo, sobre el handler completo: así NINGUNA
 * rama de retorno (éxito, 400, 404, 500) se queda sin cabecera, que era justo el
 * bug original.
 *
 * Uso:
 *   async function get(req: NextRequest) { ... }
 *   export const GET = withCachePolicy("/api/quote", get);
 */
export function withCachePolicy<Args extends unknown[]>(
  pathname: string,
  handler: (...args: Args) => Promise<Response>
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    const res = await handler(...args);
    res.headers.set("Cache-Control", cacheControlFor(pathname, res.status));
    return res;
  };
}

/** Lista de rutas con política pública, para documentación y tests. */
export function publicRoutes(): string[] {
  return Object.entries(POLICIES)
    .filter(([, p]) => p.kind === "public")
    .map(([route]) => route)
    .sort();
}

export const CACHE_ROUTES = POLICIES;
