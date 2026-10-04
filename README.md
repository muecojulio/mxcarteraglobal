# MX Cartera Global

Seguimiento de mercados — México · EE.UU. · Mundiales · PWA.

Desplegable directamente en **Vercel** sin pasos adicionales.

## Requisitos

- Node.js **20 o superior**

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

## Microinteracciones (globales)

No existe una pestaña de laboratorio: los efectos están integrados en los componentes reales y
viven en `src/app/globals.css` (más el filtro SVG de `src/components/UiMotionDefs.tsx`).
No se añadieron dependencias: todo es CSS + SVG y respeta `prefers-reduced-motion`.

| Efecto | Dónde se siente |
| --- | --- |
| Pulsación táctil 3D con rebote y destello | Botones `.ui-btn` (primario, secundario, fantasma) |
| Resorte al activar filtros | Pestañas y chips `.ui-chip` / `.ui-chip-active` |
| Pestañas segmentadas con indicador deslizante | Ficha de activo `/asset/[symbol]` |
| Menú inferior con pastilla deslizante y rebote al tocar | `src/components/BottomNav.tsx` |
| Barras superiores que se elevan al hacer scroll | `.app-header` (`animation-timeline: scroll()`) |
| Barras de progreso que crecen y se escanean | FIBRA, dividendos y analistas |
| Interruptor líquido (membrana goo SVG) | Configuración → Seguridad (biometría) |
| Aviso flotante con entrada elástica | `src/components/Toast.tsx` |
| Sello EN VIVO con pulso | `src/components/LiveBadge.tsx` |
| Entrada escalonada de páginas y secciones | `.stagger` / `.reveal` |
| Respuesta al tacto en tarjetas y enlaces | `.tap` y `a.bg-card` |

## Notas

- Interacciones de botones, pestañas, menús y barras en `src/app/globals.css` (hover solo en puntero fino).
- Caché local (`src/lib/local-cache.ts`) + Cache-Control en `/api/*`.
- No hay base SQL: no se aplican índices relacionales. Ver `docs/DATOS_E_INDICES.md`.
- Aviso de privacidad en `/legal/privacidad` (borrador LFPDPPP).
- PWA lista con `public/manifest.webmanifest`, `public/sw.js` e iconos generados.
- Middleware de rate limit y validación de origen en `src/middleware.ts` (compatible con despliegue serverless de Vercel).
