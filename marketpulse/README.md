# MX Cartera Global

Seguimiento de mercados — **México · EE.UU. · Mundiales** · PWA multiplataforma.

## Integración financiera sin API key

La aplicación está preparada para funcionar en Vercel **sin API key y sin registro** para las funciones financieras principales.

| Función | Fuente pública | API key |
|---|---|---|
| Cotizaciones, históricos y búsqueda | Yahoo Finance (endpoint público no oficial) | No |
| Índices globales | Yahoo Finance | No |
| Dividendos históricos | Yahoo Finance | No |
| Fundamentales y ratios disponibles | Yahoo Finance `quoteSummary` | No |
| Calendario de resultados | Nasdaq Public API | No |
| Calendario de dividendos | Nasdaq Public API | No |
| Calendario IPO | Nasdaq Public API | No |
| Screener base | Yahoo Finance | No |
| Acciones mexicanas `.MX` | Yahoo Finance | No |
| Forex | **No integrado** | — |
| Criptomonedas | **No integrado** | — |

**Importante:** Yahoo Finance no ofrece actualmente una API pública oficial; los endpoints utilizados son públicos/no oficiales y pueden cambiar o aplicar límites. Nasdaq expone endpoints públicos usados por su sitio. Por ello la aplicación incluye caché de Next.js y degradación a otras fuentes existentes cuando estén configuradas.

## Ejecutar

```bash
cd marketpulse
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Publicar en Vercel

No necesitas crear API keys para el modo gratuito integrado:

1. Sube el contenido de `marketpulse` a Vercel.
2. Selecciona Next.js.
3. No agregues variables financieras obligatorias.
4. Ejecuta el deploy.
5. Comprueba `/markets`, `/screener`, `/metrics`, `/calendar`, `/ipo` y una página `/asset/AAPL`.

Las variables del `.env.example` corresponden a proveedores opcionales y **no son necesarias** para el funcionamiento base.

## Limitaciones conocidas

- Las fuentes públicas no oficiales pueden cambiar sin previo aviso.
- La cotización de mercado puede tener retraso según el instrumento y la fuente.
- La cobertura de fundamentales de emisoras mexicanas puede ser menor que la de acciones estadounidenses.
- Los calendarios públicos pueden tener ventanas o cobertura distintas a proveedores profesionales.
- La aplicación no debe presentar estos datos como garantía de rendimiento ni como asesoría financiera.

## Fuentes financieras integradas
- Yahoo Finance público: cotizaciones, históricos, dividendos y métricas de acciones/ETF.
- Nasdaq Public API: cotizaciones, calendarios y ofertas públicas cuando el endpoint está disponible.
- SEC EDGAR: respaldo para filings S-1/S-1/A/424B4 cuando Nasdaq no devuelve IPOs.
- FRED: series públicas mediante CSV.
- U.S. Treasury Fiscal Data: deuda pública como contexto macro.
- TradingView Scanner: fallback/auxiliar para screening.
- Datos propios: universo ampliado de acciones/ETF y alias de símbolos.
- IA: variables opcionales; no se inventan datos si no existe una clave.

### Universo adicional solicitado
ALTY, PFFD, SCHD, QYLD, SRET1/SRET, SPYD, NOBL, SPHD, PFF, HDV, FDD, BP N/BP, PFE, MO, O, CAG, MPW, KMI, PBRA N/PBR-A, VICI, SWK, IBE N/IBE.MC, BBD N/BBD, KOFUBL/KOFUBL.MX y VZ.
