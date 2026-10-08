# Datos, índices y caché

## ¿Hay base de datos SQL?

No. MX Cartera Global persiste en el **dispositivo** (`localStorage` + caché en memoria) y usa un blob cifrado opcional en la nube. No hay Prisma, Postgres, SQLite ni Mongo en este código (`package.json` solo trae `next`, `react`, `react-dom` y `geist`).

Por eso **no se aplican índices de base de datos relacional**: crear índices SQL no tendría efecto y añadiría infraestructura que el producto no usa.

## Qué sí se indexa

El único conjunto de datos lo bastante grande para justificar un índice es el **catálogo en memoria** (BMV + BIVA + SIC, ~917 valores). Antes cada búsqueda recorría el catálogo completo y volvía a normalizar cada nombre (`NFD` + regex + `toUpperCase`) en cada tecla escrita.

| Estructura | Archivo | Qué resuelve |
|---|---|---|
| Índice invertido de trigramas | `src/lib/catalog-index.ts` | Búsqueda por símbolo y nombre sin re-normalizar el catálogo |
| Set de símbolos exactos | mismo módulo (`hasSymbol`) | `isSicSymbol()` / `isInMxUniverse()` en O(1) en vez de `.some()` lineal |
| Registro memoizado por pool | `createIndexRegistry()` | El índice se construye una sola vez por proceso |

La equivalencia con el escaneo lineal anterior está cubierta por `tests/catalog-index.test.mjs`, que compara índice contra fuerza bruta sobre símbolos, nombres, palabras, prefijos y fragmentos internos de todo el catálogo. Medición del test:

```
catálogo=917 ítems · 400 consultas · escaneo=103.6ms · índice=4.7ms (22.0x)
```

## Almacenamiento local

| Dato | Dónde | Clave |
|---|---|---|
| Watchlist, posiciones, alertas, metas | `localStorage` vía `persist.ts` | `marketpulse_*`, `mxcg_*` |
| Cotizaciones y búsquedas | memoria + `localStorage` | `mxcg_cache_v1:` + TTL |
| Límite de entradas de caché | 80 | evicción por expiración |

Lookup O(1) por clave exacta: es el equivalente práctico a un índice primario. Indexar JSON dentro de `localStorage` no aporta.

## Caché HTTP de `/api/*`

Una sola fuente de verdad: `src/lib/http-cache.ts`. Cada ruta declara su política en una tabla y `withCachePolicy()` fija la cabecera **sobre el handler completo**, así ninguna rama de retorno (200, 400, 404, 500) se queda sin ella.

Reglas:

- Solo las respuestas **200** son cacheables. Cualquier 4xx/5xx sale como `private, no-store` para no fijar un error en el CDN.
- Rutas del usuario o con secretos (`/api/sync`, `/api/realtime/token`) son siempre `private, no-store`.
- Rutas no declaradas caen en `private, no-store` (fallo seguro).

Políticas vigentes (segundos, `s-maxage` / `stale-while-revalidate`):

| Ruta | s-maxage | swr |
|---|---|---|
| `/api/quote`, `/api/quotes` | 30 | 120 |
| `/api/indices`, `/api/markets`, `/api/screener` | 60 | 300 |
| `/api/fx`, `/api/search`, `/api/asset`, `/api/public-finance`, `/api/portfolio-history` | 300 | 900–1800 |
| `/api/calendar`, `/api/ipo`, `/api/dividends`, `/api/portfolio-dividends`, `/api/portfolio-events` | 1800 | 3600 |
| `/api/analysis`, `/api/metrics` | 3600 | 86400 |
| `/api/risk-free` | 3600 | 7200 |
| `/api/dividend-growth` | 86400 | 172800 |
| `/api/sync`, `/api/realtime/token` | — | `private, no-store` |

Del lado del cliente, `src/lib/local-cache.ts` aplica `CACHE_TTL` (cotizaciones 45 s, índices 60 s, FX 5 min, búsqueda 10 min, dividendos 30 min, ficha 2 min).

## Caché offline (service worker)

`public/sw.js` es caché de dispositivo, independiente de la anterior. No guarda nada marcado `no-store` ni `private`, excluye explícitamente `/api/sync` y `/api/realtime/token`, tiene tope de 120 entradas, caducidad (5 min para `/api/*`, 24 h para páginas) y responde JSON en lugar del HTML de la app cuando falla una consulta de API.

## Si más adelante hay DB en la nube

Entonces sí: índices en `user_id`, `symbol` y `created_at` de posiciones y alertas, más un índice único por `(user_id, symbol)` para evitar duplicados. Hoy no aplica.
