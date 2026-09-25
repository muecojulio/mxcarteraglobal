# MX Cartera Global

Seguimiento de mercados — México · EE.UU. · Mundiales · PWA.

Repositorio **privado**.

## Requisitos

- Node.js **24.x** (`engines.node` en package.json)

```bash
cd marketpulse
npm install
npm run dev
```

## Notas de esta entrega

- Interacciones de botones y switches en `src/app/globals.css` (hover solo en puntero fino).
- Caché local (`src/lib/local-cache.ts`) + Cache-Control en `/api/*`.
- No hay base SQL: no se aplican índices relacionales. Ver `docs/DATOS_E_INDICES.md`.
- Aviso de privacidad en `/legal/privacidad` (borrador LFPDPPP).
- El ZIP de origen no incluía `src/components` ni `public/`; layout referencia esos módulos.
