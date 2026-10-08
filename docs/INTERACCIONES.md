# Interacciones y accesibilidad

## Implementación

Se conserva Next.js/React, el tema claro/oscuro, las rutas, los proveedores financieros y los cálculos. No se añaden dependencias al paquete de la aplicación ni se eliminan acciones.

- **globals.css**: feedback breve de presión, hover solo con mouse, foco visible, controles cómodos, estados deshabilitados y tokens de movimiento. Se completa el CSS de los componentes UI existentes. El texto secundario claro aumenta su contraste conservando la paleta. `prefers-reduced-motion` elimina desplazamientos animados, animaciones repetidas y scroll suave.
- **AccessibleTabs → SIC**: relaciones tab/panel, foco itinerante, flechas, Inicio/Fin, indicador móvil y opción centrada. Entrada/salida de 220 ms; el panel saliente conserva una instantánea y queda inerte. Swipe horizontal con umbral de distancia/velocidad y bloqueo de eje; no se intercepta el scroll nativo ni los controles anidados.
- **HorizontalRail / ScrollableChips**: scroll nativo, snap moderado, bordes de desbordamiento medidos y foco de teclado para carriles desbordados. Seleccionar un chip desplaza solamente su carril. Se usan en seguimiento, presets de métricas y los periodos de cartera ya existentes.
- **Índices de inicio**: carrusel en móvil con siguiente tarjeta parcialmente visible; cuadrícula desde 768 px. No se convierte en carrusel la lista de posiciones/seguimiento, donde la lectura vertical es más apropiada.
- **SwipeActions → seguimiento**: acciones contextuales con arrastre limitado a 104 px, umbral de media apertura o gesto rápido; conserva el scroll vertical y excluye controles anidados. El botón visible «Acciones» funciona también con teclado y mouse, incluso en escritorio. Escape cierra y devuelve foco al control. Las acciones cerradas son `inert` y `aria-hidden`; arrastrar no elimina ni abre fichas. El botón Eliminar conserva su manejador original.
- **AssetSearch**: combobox con lista de opciones, opción activa/seleccionada, flechas, Inicio/Fin, Enter y Escape; botón de apertura, cierre exterior/táctil, resultados y errores anunciados. Debounce y cancelación de solicitudes evitan resultados obsoletos y reaperturas después de cerrar. Se mantiene la navegación a la ficha y el callback de seguimiento. La búsqueda normaliza mayúsculas y diacríticos en consulta y nombres de los catálogos, sin cambiar símbolos mostrados.
- **ActionButton / CloudVaultPanel**: botón controlado con carga y `aria-busy`; bloqueo compartido de operaciones duplicadas, etiquetas de progreso específicas y confirmación/error textual en región de estado. Conserva las operaciones de cifrado/subida/bajada.
- **CollapsiblePanel → métricas**: apertura/cierre animados, relación con el control Filtros, campos cerrados fuera del foco. Se asocian las etiquetas numéricas a sus campos.
- **TaxEstimator**: switch accesible para W-8BEN, con etiqueta persistente, estado y movimiento corto; no cambia el cálculo.
- **layout**: se retira la prohibición de zoom.
- **next.config**: hosts de preview permitidos en desarrollo; el permiso para embeber la preview solo se aplica a desarrollo. Las restricciones anti-iframe de producción permanecen.

## Comprobaciones

- `npx tsc --noEmit`: pasa. Se ejecuta expresamente porque el proyecto ya tenía `ignoreBuildErrors: true` en su build.
- `npm run build`: pasa.
- `git diff --check`: pasa.
- `node --experimental-strip-types --test tests/search-text.test.mjs`: 2 pruebas pasan (acentos/case y preservación de puntuación de símbolos).
- `npm run lint`: quedan **38 errores y 14 warnings**. La revisión original, comprobada desde un archivo de `HEAD` sin cambiar de rama, tenía **39 errores y 14 warnings**. Son incidencias anteriores, principalmente estado síncrono en efectos y tipos. No se desactivaron globalmente las reglas para ocultarlas.
- `tests/interactions.cjs`: pasa en Chromium headless con APIs financieras interceptadas para datos deterministas. Verifica teclado y swipe de pestañas, combobox, apertura/cierre explícito y foco de acciones, arrastre táctil a través de CDP, exclusión de enlaces y movimientos verticales, campos inertes del acordeón, movimiento reducido, desbordamiento local móvil y cuadrícula de escritorio.

### Repetir navegador sin añadir dependencias de producción

El script necesita Playwright y un Chromium disponible en la máquina. Pueden instalarse en una carpeta temporal, fuera del proyecto:

```sh
npm install --prefix /tmp/mxcg-ui-tests playwright
NODE_PATH=/tmp/mxcg-ui-tests/node_modules /tmp/mxcg-ui-tests/node_modules/.bin/playwright install chromium
npm run dev -- --hostname 0.0.0.0
# En otra terminal:
NODE_PATH=/tmp/mxcg-ui-tests/node_modules node tests/interactions.cjs
```

Opcionales: `TEST_BASE_URL` cambia el servidor (por defecto http://localhost:3000); `CHROMIUM_PATH` usa un ejecutable instalado. En Linux pueden necesitarse bibliotecas del sistema. Las pruebas usan datos y almacenamiento aislados, no una cartera real. La prueba táctil usa CDP y está orientada a Chromium.

## Límites de la validación

- Falta la prueba manual con lectores de pantalla (VoiceOver, TalkBack, NVDA), Safari/iOS y dispositivos físicos; la emulación no la sustituye.
- Las pruebas de navegador no validan proveedores de cotizaciones ni una transferencia real de nube: se interceptan las APIs, y las conexiones financieras externas están restringidas en este entorno.
- El entorno tiene Node 22; el proyecto solicita Node 24. Build y tipos pasan aquí, pero conviene repetirlos con Node 24 en CI.
- Se mantienen selectores nativos y enlaces de navegación donde ya son apropiados. No se sustituyen todas las pantallas por widgets nuevos ni se convierte navegación entre rutas en pestañas artificiales.
- La lista de seguimiento mantiene el botón explícito para mostrar acciones tanto en móvil como en escritorio; no exige saber usar swipe.
