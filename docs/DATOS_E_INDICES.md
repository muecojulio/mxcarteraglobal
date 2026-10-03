# Datos e índices

## ¿Hay base de datos SQL?

No. MX Cartera Global persiste en el **dispositivo** (`localStorage` + caché en memoria). No hay Prisma, Postgres, SQLite ni Mongo en este código.

Por eso **no se aplican índices de base de datos relacional**. Crear índices SQL no tendría efecto y añadiría infraestructura que el producto no usa.

## Qué sí conviene (y ya está)

| Dato | Dónde | Índice / clave |
|---|---|---|
| Watchlist, posiciones, alertas, metas | `localStorage` vía `persist.ts` | Clave exacta (`marketpulse_*`, `mxcg_*`) |
| Cotizaciones y búsquedas | memoria + `localStorage` `mxcg_cache_v1:` | clave string + TTL |
| Límite de entradas de caché | 80 | evicción por expiración |

Eso es el equivalente práctico a un índice primario: lookup O(1) por clave. Indexar JSON dentro de `localStorage` no aporta.

## Caché HTTP

Rutas `/api/*` envían `Cache-Control: public, s-maxage=30, stale-while-revalidate=120` para el edge de Vercel. El cliente usa `CACHE_TTL` en `src/lib/local-cache.ts`.

## Si más adelante hay DB en la nube

Entonces sí: índices en `user_id`, `symbol`, `created_at` de posiciones/alertas. Hoy no aplica.
