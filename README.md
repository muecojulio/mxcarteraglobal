# MarketPulse

Seguimiento de mercados — **México · EE.UU. · Mundiales** · 100% gratuita · PWA multiplataforma

## Enlace y código QR

Abre **`/install`** en la app (Más → Instalar / QR):

- Enlace para copiar o compartir
- Código QR para escanear con otro teléfono
- Instrucciones por dispositivo

Cuando publiques la app (ej. `https://tudominio.com`), el QR apuntará a esa URL automáticamente.

## Instalar en cualquier dispositivo

| Dispositivo | Cómo instalar |
|-------------|---------------|
| **iPhone / iPad** | Safari → botón Compartir → **Añadir a pantalla de inicio** |
| **Android** | Chrome → menú ⋮ → **Instalar app** / Añadir a inicio |
| **Windows / Mac / Linux** | Chrome o Edge → icono de instalar en la barra de direcciones (o menú → Instalar MarketPulse) |
| **Safari Mac** | Archivo → Añadir al Dock |

Requisitos: abrir la app por **HTTPS** o **localhost**. El service worker y el `manifest.webmanifest` ya están configurados (`display: standalone`, orientación libre para iPad y PC).

## Datos reales

| Dato | Fuente |
|------|--------|
| Precios EE.UU. | Finnhub |
| Precios México | DataBursatil |
| Internacional | Yahoo |
| Dividendos US | FMP |
| Dividendos MX | DataBursatil |

## Ejecutar

```bash
cd marketpulse
npm install
npm run dev
```

Abre http://localhost:3000

Para probar instalación en el móvil: misma Wi‑Fi y la IP `Network` que muestra Next.js (http://192.168.x.x:3000).


## Publicar en internet (HTTPS)

Guía completa: ver **[DEPLOY.md](./DEPLOY.md)**

Resumen rápido con Vercel (gratis):
1. Cuenta en https://vercel.com
2. Sube el proyecto `marketpulse`
3. Añade las variables de entorno (API keys)
4. Usa la URL `https://….vercel.app` — el QR en `/install` apuntará a ella


## Alpha Vantage (métricas)

1. Key gratis: https://www.alphavantage.co/support/#api-key
2. En `.env.local`:
   ```
   ALPHA_VANTAGE_API_KEY=tu_clave
   ```
3. Se usa en `/api/metrics` (OVERVIEW) con caché 24h. Free: ~25 llamadas/día.


## Polygon (respaldo US)

1. Key gratis: https://polygon.io/dashboard/signup (o Massive)
2. `.env.local`: `POLYGON_API_KEY=tu_clave`
3. Cadena cotizaciones US: **Finnhub → Polygon → Yahoo → mock**
4. Free: ~5 req/min, datos con delay ~15 min


## Finage

1. Key: https://finage.co.uk (registro gratis)
2. `.env.local`: `FINAGE_API_KEY=tu_clave`
3. Cadena US: **Finnhub → Polygon → Finage → Yahoo**
