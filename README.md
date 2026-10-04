# MX Cartera Global

Seguimiento de mercados — México · EE.UU. · Mundiales · PWA.

Desplegable directamente en **Vercel** sin pasos adicionales.

## Requisitos

- Node.js **24.x** (alineado con el runtime actual de Vercel)

```bash
npm install
npm run dev
```

## Despliegue en Vercel

1. Importa este repositorio en Vercel.
2. Framework detectado automáticamente como **Next.js**.
3. No requiere variables de entorno obligatorias; las API keys opcionales (`.env.example`) se pueden agregar en Project Settings → Environment Variables.
4. Presiona Deploy.

## Scripts

- `npm run dev` — Servidor de desarrollo.
- `npm run build` — Build de producción (usado por Vercel).
- `npm start` — Servidor de producción.
- `npm run lint` — ESLint.

## Notas

- Interacciones de botones y switches en `src/app/globals.css` (hover solo en puntero fino).
- Caché local (`src/lib/local-cache.ts`) + Cache-Control en `/api/*`.
- No hay base SQL: no se aplican índices relacionales. Ver `docs/DATOS_E_INDICES.md`.
- Aviso de privacidad en `/legal/privacidad` (borrador LFPDPPP).
- PWA lista con `public/manifest.webmanifest`, `public/sw.js` e iconos generados.
- Proxy de rate limit y validación de origen en `src/proxy.ts` (convención actual de Next.js y compatible con Vercel).
