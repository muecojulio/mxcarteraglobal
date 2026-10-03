# Publicar MX Cartera Global (HTTPS + enlace + QR)

Para que cualquiera pueda abrir el enlace o escanear el QR desde cualquier red, la app debe estar en internet con **HTTPS**.

## Opción recomendada: Vercel (gratis)

### 1. Cuenta
1. Entra a https://vercel.com y regístrate (GitHub, Google o email).
2. Es gratis para proyectos personales.

### 2. Subir el proyecto
**Opción A — Desde la web**
1. En Vercel: **Add New… → Project**
2. Conecta GitHub e importa este repositorio.
3. Framework: **Next.js** (se detecta automáticamente).
4. Root Directory: déjalo en la raíz del repositorio (no entres a subcarpetas).
5. Presiona **Deploy**.

**Opción B — Desde la terminal** (en tu PC)
```bash
npm install -g vercel
vercel login
vercel --prod
```
Sigue las preguntas (proyecto nuevo, defaults).

### 3. Variables de entorno (API keys)
No son obligatorias para funcionar (la app usa datos públicos y mock de respaldo).
En Vercel → Project → **Settings → Environment Variables**, puedes añadir opcionalmente:

| Nombre | Valor |
|--------|--------|
| `FINNHUB_API_KEY` | tu clave Finnhub |
| `DATABURSATIL_TOKEN` | tu token DataBursatil |
| `FMP_API_KEY` | tu clave FMP |
| `POLYGON_API_KEY` | tu clave Polygon |
| `FINAGE_API_KEY` | tu clave Finage |
| `TWELVEDATA_API_KEY` | tu clave TwelveData |

Marca Production + Preview. Luego **Redeploy**.

### 4. Dominio
Vercel te da algo como:
`https://mx-cartera-global-xxx.vercel.app`

Ese es el **enlace público**. En la app, **Más → Instalar / QR** mostrará ese dominio y un QR que apunta a él.

### 5. (Opcional) Dominio propio
Settings → Domains → añade tu dominio.

---

## Después de publicar

1. Abre `https://tu-url.vercel.app/install`
2. Copia el enlace o muestra el QR
3. En iPhone: Safari → Compartir → Añadir a pantalla de inicio
4. En Android: Chrome → Instalar app

---

## Requisitos verificados

- ✅ Build de producción (`npm run build`) pasa sin errores.
- ✅ `package.json` en la raíz del repositorio.
- ✅ `vercel.json` configurado para Next.js.
- ✅ Node.js >=20 soportado (Vercel usa 20/22 por defecto).
- ✅ PWA: `manifest.webmanifest`, `sw.js` e iconos en `public/`.
- ✅ Sin dependencias de red en build (fuentes del sistema en lugar de Google Fonts).

## Importante

- **No subas** archivos `.env*.local` a GitHub (tienen secretos).
- Las claves van solo en el panel de Vercel.
- Sin HTTPS, muchos móviles no permiten “Instalar app”.
