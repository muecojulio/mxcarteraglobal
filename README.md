# MarketPulse

Seguimiento de mercados — **México · EE.UU. · mercados globales** · PWA multiplataforma.

## Fuentes de datos financieros

La app intenta primero las fuentes públicas que no requieren API key ni registro:

| Datos | Fuente primaria pública | Alternativa si falta o falla |
|---|---|---|
| Precios, histórico, métricas y dividendos | Yahoo Finance (endpoints públicos/no oficiales) | Finnhub, Polygon/Massive, Finage, DataBursatil o Twelve Data configurados en el servidor |
| Cotizaciones/calendario/screener Nasdaq | Nasdaq public endpoints | Yahoo; luego proveedores con variables de entorno |
| Cotizaciones de respaldo | TradingView Scanner API pública/no oficial | Proveedores con variables de entorno |
| Fundamentales y filings de compañías | SEC EDGAR CompanyFacts / submissions | Métricas de Yahoo y proveedores configurados |
| Tasa Treasury de referencia | FRED public CSV; U.S. Treasury Fiscal Data | Yahoo ^IRX y, al final, estimación etiquetada |

Las rutas de datos son **server-side**: las claves existentes nunca se envían al navegador. Si ninguna fuente confirma un precio, la app deja el dato vacío; no genera cotizaciones aleatorias. Forex y criptomonedas no forman parte del universo de búsqueda, métricas, screener ni análisis bursátil. El conversor de moneda de la cartera es una función independiente.

La ficha de activo, dividendos, métricas, screener, calendario de IPO y tasa libre de riesgo usan estas fuentes. El catálogo incluye los ETFs/acciones solicitados y normaliza alias como `SRET1 → SRET`, `BP N → BP`, `PBRA N → PBR-A`, `IBE N → IBE.MC`, `BBD N → BBD` y `KOFUBl → KOFUBL.MX`.

Ver detalles, límites y atribución en **[docs/FUENTES_FINANCIERAS.md](./docs/FUENTES_FINANCIERAS.md)**.

## Variables opcionales de respaldo

No necesitas configurar ninguna para usar las fuentes públicas. Si ya tienes claves, se leen únicamente como fallback desde `.env.local` o el entorno de despliegue:

```env
FINNHUB_API_KEY=
DATABURSATIL_TOKEN=
FMP_API_KEY=
POLYGON_API_KEY=
MASSIVE_API_KEY=
FINAGE_API_KEY=
ALPHA_VANTAGE_API_KEY=
TWELVEDATA_API_KEY=
SEC_USER_AGENT=
```

`SEC_USER_AGENT` es opcional (no es una API key); si se define, usa un identificador de app y un email de contacto válido para cumplir mejor las directrices de SEC EDGAR. Copia `.env.example` como base. No subas `.env.local` a GitHub.

## Ejecutar

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

## Instalar / compartir

Abre **`/install`** en la app (Más → Instalar / QR) para copiar el enlace, compartir el QR o consultar las instrucciones.

| Dispositivo | Cómo instalar |
|---|---|
| iPhone / iPad | Safari → Compartir → Añadir a pantalla de inicio |
| Android | Chrome → menú ⋮ → Instalar app / Añadir a inicio |
| Windows / Mac / Linux | Chrome o Edge → icono de instalación / menú → Instalar MarketPulse |
| Safari Mac | Archivo → Añadir al Dock |

Requisito: HTTPS o localhost. El service worker y `manifest.webmanifest` ya están configurados.

## Publicar

Guía: **[DEPLOY.md](./DEPLOY.md)**. En Vercel, las variables anteriores son opcionales; no hace falta añadir API keys para el flujo público.

## Análisis y datos propios

El análisis de activo usa reglas deterministas y datos públicos junto con los cálculos de cartera que permanecen en el dispositivo. No depende de una IA externa ni transmite la cartera a un proveedor de IA; no es asesoramiento de inversión. Los campos ausentes se dejan como no disponibles, no se inventan.
