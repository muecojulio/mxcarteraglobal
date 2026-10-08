# Publicar MarketPulse (HTTPS + enlace + QR)

Para que cualquiera pueda abrir el enlace o escanear el QR desde cualquier red, la app debe estar en internet con **HTTPS**.

## Opción recomendada: Vercel (gratis)

### 1. Cuenta
1. Entra a https://vercel.com y regístrate (GitHub, Google o email).
2. El plan gratuito es suficiente para publicar una app personal.

### 2. Subir el proyecto
1. En Vercel: **Add New… → Project**.
2. Conecta el repositorio de GitHub.
3. Framework: **Next.js** (se detecta solo).

También se puede usar la CLI desde una copia local:

```bash
npm install
npm install -g vercel
vercel login
vercel
```

### 3. Variables de entorno (opcionales)

La app ya usa Yahoo Finance, Nasdaq, TradingView Scanner, SEC EDGAR, FRED y U.S. Treasury sin API key. Si quieres habilitar respaldos de proveedores que ya tenías configurados, añade solo las variables que ya tengas en Vercel → Project → **Settings → Environment Variables**:

- `FINNHUB_API_KEY`
- `DATABURSATIL_TOKEN`
- `FMP_API_KEY`
- `POLYGON_API_KEY` o `MASSIVE_API_KEY`
- `FINAGE_API_KEY`
- `ALPHA_VANTAGE_API_KEY`
- `TWELVEDATA_API_KEY`
- `SEC_USER_AGENT` (opcional; identificador y email de contacto real para SEC EDGAR)

No es necesario completar ninguna de ellas para utilizar el flujo de fuentes públicas. Marca Production + Preview para las variables de respaldo que sí agregues y luego ejecuta **Redeploy**.

### 4. Dominio

Vercel te da una URL como `https://marketpulse-xxx.vercel.app`. En la app, **Más → Instalar / QR** mostrará ese dominio y un QR que apunta a él.

### 5. (Opcional) Dominio propio

Settings → Domains → añade tu dominio.

---

## Después de publicar

1. Abre `https://tu-url.vercel.app/install`.
2. Copia el enlace o muestra el QR.
3. En iPhone: Safari → Compartir → Añadir a pantalla de inicio.
4. En Android: Chrome → Instalar app.

---

## Importante

- **No subas** el archivo `.env.local` a GitHub.
- Las claves opcionales van solo en el panel de Vercel/Netlify; nunca se exponen al cliente.
- Sin HTTPS, muchos móviles no permiten instalar una PWA.
