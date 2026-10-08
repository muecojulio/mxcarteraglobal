# Integración de fuentes financieras públicas

## Política de proveedor

La app prioriza fuentes que se pueden consultar sin API key ni registro. Si una fuente pública falla, responde vacía o no cubre un ticker, se intentan las variables de entorno que ya existían. No se generan precios aleatorios ni se presenta un fallback estimado como si fuera un precio de mercado.

### Cotizaciones

1. **Yahoo Finance** — precio, cambio, histórico, búsqueda, métricas básicas y eventos de dividendos. Se usan endpoints públicos no oficiales; no tienen SLA y pueden limitar tráfico o cambiar.
2. **Nasdaq public endpoints** — respaldo de cotización y calendario/screener donde el ticker o el exchange están cubiertos.
3. **TradingView Scanner** — último respaldo público/no oficial para una cotización; se usa en servidor y se marca como `tradingview`.
4. **Variables de entorno** — `DATABURSATIL_TOKEN` para México; `FINNHUB_API_KEY`, `POLYGON_API_KEY`/`MASSIVE_API_KEY` y `FINAGE_API_KEY` para EE.UU.; `TWELVEDATA_API_KEY` para cobertura adicional global.
5. Si no hay una cotización confirmada, las rutas devuelven null, una lista incompleta o `404`; nunca se inventa un precio.

FMP no implementa cotizaciones en el proveedor Composite actual. Se conserva como respaldo para fundamentales, dividendos, calendario de analistas y métricas cuando está configurado.

### URLs consumidas

| Fuente | Uso | API key |
|---|---|---|
| `query1.finance.yahoo.com/v8/finance/chart/{symbol}` | Cotización, histórico y dividendos | No |
| `query1.finance.yahoo.com/v1/finance/search` | Búsqueda | No |
| `query2.finance.yahoo.com/v10/finance/quoteSummary/{symbol}` | Métricas y datos de fondos | No |
| `api.nasdaq.com/api/quote/{symbol}/summary` | Cotización pública | No |
| `api.nasdaq.com/api/calendar/{ipo,earnings,dividends}` | Calendarios | No |
| `api.nasdaq.com/api/screener/stocks` | Screener Nasdaq | No |
| `scanner.tradingview.com/america/scan` | Cotización de respaldo | No; API pública no oficial |
| `efts.sec.gov/LATEST/search-index` | Filings/solicitudes IPO | No |
| `www.sec.gov/files/company_tickers.json` | Mapeo símbolo–CIK | No |
| `data.sec.gov/api/xbrl/companyfacts/CIK…json` | Datos XBRL reportados por compañías | No |
| `data.sec.gov/submissions/CIK…json` | Filings por compañía | No |
| `fred.stlouisfed.org/graph/fredgraph.csv?id=DGS3MO` | Rendimiento Treasury 3 meses | No |
| `api.fiscaldata.treasury.gov/.../debt_to_penny` | Deuda federal de EE.UU. | No |

Los endpoints Yahoo/Nasdaq/TradingView no son contratos estables de datos. Ante error o cambio de formato, el manejo es fail-soft: no se bloquea la ficha y se continúa con el siguiente proveedor.

### Divulgación SEC

SEC EDGAR no necesita token, pero solicita que las aplicaciones automatizadas se identifiquen con un `User-Agent`. Se puede configurar `SEC_USER_AGENT` con un identificador y un email de contacto válido. Si no se configura, la app envía su nombre y repositorio como identificador; SEC puede limitar esa petición y el endpoint devuelve null. Los datos XBRL solo se muestran para entidades con cobertura SEC y no sustituyen estados financieros auditados.

## Datos conectados a funcionalidades

- **Ficha de activo** (`/api/asset`): precio e histórico Yahoo; métricas de Yahoo; filings y estados anuales SEC cuando el ticker es una acción estadounidense cubierta; campos extra de Finnhub/FMP si existen variables configuradas; dividendos públicos primero.
- **Análisis automático** (`/api/analysis`): usa métricas Yahoo y SEC antes de completar huecos con Finnhub/FMP. El resultado es un conjunto transparente de reglas, no un pronóstico ni una IA externa.
- **Búsqueda** (`/api/search`): catálogo SIC local primero; Yahoo Finance se consulta como ampliación. Se excluyen tipos `CURRENCY`/`CRYPTO` y pares típicos de FX/cripto.
- **Métricas** (`/api/metrics`): resumen Yahoo público primero; Finnhub, FMP y Alpha Vantage opcionales solo complementan datos ausentes. Alpha Vantage mantiene caché y límite diario conservador.
- **Screener** (`/api/screener`): usa cotizaciones Composite con Yahoo/Nasdaq/TradingView antes de FMP opcional.
- **Calendario IPO** (`/api/ipo`): Nasdaq primero, filings S-1 SEC como respaldo (etiquetados como filings, no como IPO confirmado) y Finnhub si se configuró.
- **Tasa libre de riesgo** (`/api/risk-free`): FRED `DGS3MO`, Yahoo `^IRX` si FRED no está disponible. La referencia mexicana mostrada es un diferencial estimado respecto a EE.UU.; no es una tasa CETES oficial.
- **Datos públicos complementarios** (`/api/public-finance`): combina FRED, Treasury, Nasdaq, TradingView, Yahoo y SEC según los parámetros recibidos.

Ejemplos:

```text
/api/public-finance?symbol=SCHD
/api/public-finance?symbols=ALTY,PFFD,SCHD,QYLD,SRET
/api/public-finance?series=DGS10&symbols=SPHD,PFF
/api/public-finance?calendar=ipo&from=2026-01-01&to=2026-12-31&ipos=1
/api/public-finance?nasdaqScreener=1&exchange=nasdaq
```

## Símbolos incluidos y alias aceptados

Los valores se guardan y consultan con el símbolo canónico que entienden Yahoo y las APIs configuradas. Alias frecuentes aceptados en búsqueda, rutas de ficha y listas:

| Entrada | Símbolo canónico |
|---|---|
| `SRET1` | `SRET` |
| `BP N` | `BP` |
| `PBRA N`, `PBR A` | `PBR-A` |
| `IBE N`, `IBE` | `IBE.MC` |
| `BBD N` | `BBD` |
| `KOFUBl`, `KOFUBL` | `KOFUBL.MX` |

El universo SIC contiene las acciones/ETFs solicitados; la página **ETFs**, la búsqueda, el screener, la ficha, los dividendos y métricas utilizan la misma forma canónica. El catálogo de distribución marca los instrumentos indicados como pagadores habituales; no garantiza distribuciones futuras.

## Exclusiones y cálculos internos

Forex y criptomonedas no se incorporan a la búsqueda, métricas, screener, ficha ni análisis de activos. La conversión monetaria interna de la cartera sigue separada: utiliza un tipo de cambio para expresar posiciones en MXN, no para ofrecer pares FX como instrumentos de inversión.

Las posiciones, watchlist, metas y datos propios de cartera siguen almacenados localmente en el dispositivo. La app no envía esos datos a una IA externa. Los análisis propios son deterministas y se identifican como educativos; las respuestas de APIs pueden estar retrasadas, incompletas o sujetas a términos de cada proveedor.
