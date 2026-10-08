# Publicar MarketPulse (HTTPS + enlace + QR)

Para que cualquiera pueda abrir el enlace o escanear el QR desde cualquier red, la app debe estar en internet con **HTTPS**.

## Opción recomendada: Vercel (gratis)

### 1. Cuenta
1. Entra a https://vercel.com y regístrate (GitHub, Google o email).
2. Es gratis para proyectos personales.

### 2. Subir el proyecto
**Opción A — Desde la web**
1. En Vercel: **Add New… → Project**
2. Conecta GitHub y sube esta carpeta `marketpulse` a un repositorio, o usa “Upload”
3. Framework: **Next.js** (se detecta solo)

**Opción B — Desde la terminal** (en tu PC)
```bash
cd marketpulse
npm install -g vercel
vercel login
vercel
```
Sigue las preguntas (proyecto nuevo, defaults).

### 3. Variables de entorno (API keys)
En Vercel → Project → **Settings → Environment Variables**, añade:

| Nombre | Valor |
|--------|--------|
| `FINNHUB_API_KEY` | tu clave Finnhub |
| `DATABURSATIL_TOKEN` | tu token DataBursatil |
| `FMP_API_KEY` | tu clave FMP |
| `TWELVEDATA_API_KEY` | (opcional) |

Marca Production + Preview. Luego **Redeploy**.

### 4. Dominio
Vercel te da algo como:
`https://marketpulse-xxx.vercel.app`

Ese es el **enlace público**. En la app, **Más → Instalar / QR** mostrará ese dominio y un QR que apunta a él.

### 5. (Opcional) Dominio propio
Settings → Domains → añade `marketpulse.tudominio.com`.

---

## Después de publicar

1. Abre `https://tu-url.vercel.app/install`
2. Copia el enlace o muestra el QR
3. En iPhone: Safari → Compartir → Añadir a pantalla de inicio
4. En Android: Chrome → Instalar app

---

## Opción alternativa: Netlify

1. https://app.netlify.com
2. Add new site → Import project
3. Build command: `npm run build`
4. Publish directory: `.next` (mejor usar el plugin oficial de Next.js)

O con CLI:
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

---

## Importante

- **No subas** el archivo `.env.local` a GitHub (tiene secretos).
- Las claves van solo en el panel de Vercel/Netlify.
- Sin HTTPS, muchos móviles no permiten “Instalar app”.
