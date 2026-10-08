// MarketPulse — Service Worker
//
// Reglas de caché (esto es caché OFFLINE del dispositivo, distinta de la caché
// HTTP del edge que fija Cache-Control en las rutas /api/*):
//   1. Nunca se guarda lo marcado `no-store` ni las rutas sensibles: los
//      respaldos cifrados no deben quedar en Cache Storage.
//   2. La caché tiene tope de entradas y caducidad; antes crecía sin límite.
//   3. Si falla una petición de /api/* se responde JSON, no el HTML de la app.

const CACHE_NAME = "marketpulse-v2";
const OFFLINE_URLS = ["/", "/watchlist", "/portfolio", "/more"];

// Rutas que jamás entran en Cache Storage.
const NEVER_CACHE = ["/api/sync"];

const MAX_ENTRIES = 120;
const API_TTL_MS = 5 * 60 * 1000; // 5 min
const PAGE_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(OFFLINE_URLS).catch(() => {
        // Fallos individuales de precarga no deben romper la instalación.
      })
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isCacheable(request, response) {
  if (request.method !== "GET") return false;
  if (!response || !response.ok) return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (NEVER_CACHE.some((path) => url.pathname.startsWith(path))) return false;
  // Respeta el no-store que el servidor ya decide por ruta.
  const cc = response.headers.get("cache-control") || "";
  if (cc.includes("no-store") || cc.includes("private")) return false;
  return true;
}

function ttlFor(pathname) {
  return pathname.startsWith("/api/") ? API_TTL_MS : PAGE_TTL_MS;
}

/** Marca el momento en que se guardó, para poder caducar la entrada después. */
async function stamp(response) {
  const headers = new Headers(response.headers);
  headers.set("x-cached-at", String(Date.now()));
  return new Response(await response.clone().arrayBuffer(), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** Borra entradas caducadas y las que excedan el tope (las más viejas primero). */
async function evict(cache) {
  const now = Date.now();
  const keys = await cache.keys();
  const scored = [];

  for (const request of keys) {
    const cached = await cache.match(request);
    const at = Number(cached?.headers.get("x-cached-at") || 0);
    const ttl = ttlFor(new URL(request.url).pathname);
    if (at && now - at > ttl) {
      await cache.delete(request);
    } else {
      scored.push({ request, at });
    }
  }

  if (scored.length <= MAX_ENTRIES) return;
  scored.sort((a, b) => a.at - b.at);
  const drop = scored.slice(0, scored.length - MAX_ENTRIES);
  await Promise.all(drop.map((entry) => cache.delete(entry.request)));
}

async function readFresh(cache, request) {
  const cached = await cache.match(request);
  if (!cached) return null;
  const at = Number(cached.headers.get("x-cached-at") || 0);
  if (!at) return cached; // precargado en install, sin marca
  if (Date.now() - at > ttlFor(new URL(request.url).pathname)) return null;
  return cached;
}

function offlineApiResponse() {
  return new Response(
    JSON.stringify({
      error: "Sin conexión: no hay datos guardados de esta consulta.",
      offline: true,
    }),
    { status: 503, headers: { "Content-Type": "application/json" } }
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (isCacheable(request, response)) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, await stamp(response));
          event.waitUntil(evict(cache));
        }
        return response;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        const cached = await readFresh(cache, request);
        if (cached) return cached;
        if (new URL(request.url).pathname.startsWith("/api/")) {
          return offlineApiResponse();
        }
        return (await cache.match("/")) || Response.error();
      }
    })()
  );
});
