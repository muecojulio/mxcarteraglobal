# Seguridad

Decisiones de seguridad y riesgos aceptados de MX Cartera Global. Cada punto
dice **qué** se decidió, **por qué** y **cómo comprobarlo**.

Modelo de amenaza de partida: PWA personal de seguimiento de mercados, sin
cuentas ni base de datos. Los datos del usuario (cartera, listas, metas, alertas)
viven **en el dispositivo**, cifrados si la clave de acceso está activa. El
servidor es un intermediario que consulta fuentes públicas y guarda un blob
cifrado opcional. Por eso el trabajo de seguridad se concentra en: (1) que las
llaves de los proveedores no salgan del servidor, (2) que los datos locales no
se puedan leer sin la clave, y (3) no abrir superficie de XSS/DoS innecesaria.

---

## 1. La llave de Finnhub no se entrega al navegador

**Decisión:** se eliminó el WebSocket de Finnhub en el cliente y la ruta
`/api/realtime/token`. Las cotizaciones se actualizan pidiendo datos a las rutas
propias (`/api/quotes`, `/api/indices`, …) cada 45–60 s.

**Por qué:** una llave que el navegador necesita no se puede esconder. La ruta
era pública (`curl` sin `Origin` pasaba el filtro) y cualquier visitante podía
pedirla y quemar la cuota, o provocar que Finnhub la bloqueara. A cambio se
pierden los *ticks* por operación; para una cartera personal, el sondeo del
servidor es suficiente y no expone nada.

**Comprobación:** `curl https://<app>/api/realtime/token` → 404; la CSP ya no
incluye `wss:`; `grep -rn "ws.finnhub.io" src/` → sin resultados.

## 2. Límite de peticiones: cubo por cliente, fail-closed por defecto

**Decisión:** la clave del límite (`src/lib/client-ip.ts`) se resuelve así:

| Entorno | Qué se usa |
|---|---|
| Vercel (`VERCEL=1`) | `x-real-ip` o el primer salto de `x-forwarded-for` (Vercel los reescribe) |
| Auto-hospedado con proxy propio (`TRUST_PROXY=1`) | último salto de `x-forwarded-for` |
| Producción sin proxy declarado | cubo único `shared` para todos |
| Desarrollo | último salto (comodidad) |

**Por qué:** el primer salto lo elige quien llama →
`curl -H "X-Forwarded-For: $RANDOM"` creaba un cubo por petición (medido: 50
peticiones, 0 bloqueos antes; 429 desde la 46 después, en las tres
configuraciones). El último salto solo es fiable si hay un proxy de confianza que
lo añada; si no, el cliente lo elige igual. Por eso el defecto en producción es
**no confiar en ninguna cabecera**: un atacante no puede multiplicar cubos, y el
peor caso es que consuma el cubo común durante un minuto.

**Límite conocido (no resuelto):** en serverless el contador vive por instancia,
así que con N instancias el tope efectivo es hasta N × 45/min. Un límite
distribuido requiere un almacén compartido (Upstash/Vercel KV) con su propia
credencial y costo; se decidió **no** añadir una dependencia externa para una app
personal, y en su lugar dejar que las cachés (`next: { revalidate }`, cabeceras
`Cache-Control` por ruta) absorban el tráfico repetido antes de llegar a las
fuentes.

**Comprobación:** `npm test -- tests/client-ip.test.mjs` cubre las cuatro ramas;
en un servidor real: 50 peticiones con el mismo cliente → `429` desde la 46, y
un cliente distinto no se ve afectado.

## 3. Clave de acceso: PBKDF2 + mínimo 6 caracteres

**Decisión:**

- Verificador de clave: `pbkdf2$210000$<salt>$<hash>` (antes: SHA-256 sin salt).
  Lo mismo para el código de recuperación.
- Mínimo **6** caracteres (antes 4; máximo 64, admite frases).
- Las bóvedas ya creadas se **migran solas**: al acertar la clave se reescribe el
  verificador, y el paquete que envuelve la llave maestra pasa a
  `p2$<iteraciones>$<iv>$<ct>` con 210 000 iteraciones (antes 120 000 fijas, sin
  poder subirlas sin dejar fuera a los vaults existentes).
- Intentos fallidos y bloqueo en `localStorage` (antes `sessionStorage`, que se
  reinicia al abrir otra pestaña) con espera creciente: 30 s → 15 min.

**Por qué:** con 4 dígitos hay 10 000 combinaciones; el verificador sin salt se
rompía en milisegundos con acceso al `localStorage` y daba la clave que abre la
llave maestra. La longitud es lo que aporta entropía; PBKDF2 con salt encarece
cada intento offline y elimina las tablas precomputadas. No se fuerza el cambio
de una clave corta existente (evita dejar al usuario fuera): la app avisa en
Ajustes y al desbloquear se registra la longitud para poder avisar.

**Límite conocido:** el candado es una barrera de interfaz; quien pueda ejecutar
JavaScript en el origen puede llamar a `markUnlocked()`. Lo que protege los datos
es el cifrado, no la pantalla de bloqueo. Los biométricos son un atajo local, sin
verificación en servidor.

**Comprobación:** `npm test -- tests/security-hardening.test.mjs`.

## 4. Respaldo en la nube (jsonblob)

**Decisión:** se mantiene jsonblob como intermediario ciego, con estas
condiciones: sobre **v2** con salt aleatoria por respaldo, tope de 512 KB,
validación de campos antes de subir, y mensajes que distinguen "clave incorrecta"
de "copia reemplazada o dañada". El ID se trata como secreto y así se explica en
la UI.

**Riesgo aceptado:** jsonblob no tiene control de acceso. Quien tenga el ID puede
**reemplazar o borrar** la copia (disponibilidad), aunque no leerla ni
falsificarla sin la clave (AES-GCM autentica el contenido). Eliminar eso requiere
un backend con cuentas (otro proveedor, otra credencial, otra cuota) y no
compensa para una app personal: la copia es un extra, la fuente de verdad es el
dispositivo.

## 5. Advisories de `npm audit` (devDependencies)

**Decisión:** no bajar `eslint-config-next` (lo que sugiere `npm audit`) ni
silenciar el resultado.

**Por qué:** las cinco alertas "high" son de la cadena
`eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch →
braces`, es decir, **solo herramientas de desarrollo**: no entran al bundle ni se
ejecutan en producción. La de `braces` (GHSA-vfj7-8cjw-p6xm, sep-2026) **no tiene
versión corregida** (`first_patched: null`) y solo se dispara procesando patrones
glob muy anidados en el linter. La "solución" que propone npm es degradar
`eslint-config-next` a 14.2.35 (semver-major, incompatible con Next 16): una
regresión real a cambio de nada.

**Comprobación:**

```bash
npm audit --omit=dev   # el árbol de producción debe salir limpio
```

## 6. CSP con nonce (sin `'unsafe-inline'` en `script-src`)

**Decisión:** en producción la CSP se construye por petición en `src/proxy.ts`
(`src/lib/csp.ts`) con un nonce de 128 bits:

```
script-src 'self' 'nonce-…' 'strict-dynamic'
```

Next aplica el nonce a los scripts que renderiza (lee la cabecera CSP de la
petición) y el script inline de tema de `layout.tsx` lo recibe por prop. En
desarrollo se mantiene la política permisiva (`'unsafe-inline'` + `'unsafe-eval'`)
porque el HMR inyecta scripts sin nonce; nunca se mezclan, ya que la presencia de
un nonce hace que el navegador ignore `'unsafe-inline'`.

**Costo aceptado:** un nonce por petición obliga a renderizar en el servidor
(adiós al prerenderizado estático de las 13 páginas). Es el precio documentado
por Next; se prefirió eso a dejar `script-src 'unsafe-inline'`.

`style-src` sí conserva `'unsafe-inline'`: React emite atributos `style` en el
HTML del servidor y no hay nonce para atributos. El riesgo es mucho menor que el
de scripts.

**Comprobación:** con un build de producción real:

```bash
curl -sD- -o /tmp/p.html http://localhost:3000/ | head -5   # CSP con nonce, sin unsafe-inline
grep -o 'nonce="[^"]*"' /tmp/p.html | wc -l                  # todos los <script> lo llevan
```

---

## Qué NO está cubierto

- **Límite distribuido** de peticiones (ver §2) y bloqueo por IP en el borde.
- **Integridad de la copia en la nube** frente a quien tenga el ID (§4).
- **XSS por datos de terceros**: React escapa el texto y no hay
  `dangerouslySetInnerHTML` con datos de proveedores, pero la CSP con nonce es la
  segunda línea, no una garantía de que no exista ningún *sink*.
- **Ataques al dispositivo**: si el atacante controla el sistema operativo con la
  app desbloqueada, no hay mucho que hacer (ni aquí ni en apps nativas sin
  hardware seguro).
