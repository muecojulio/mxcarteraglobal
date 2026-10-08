/**
 * Content-Security-Policy de las páginas.
 *
 * Módulo puro (sin `next/server`) para poder probarse con `node --test`.
 *
 * ## Por qué antes había `'unsafe-inline'` en `script-src`
 *
 * Next.js inyecta scripts inline en el HTML (el payload RSC de hidratación) y
 * este repo además tiene un script inline propio en `layout.tsx` para aplicar el
 * tema antes del primer pintado. `'unsafe-inline'` los permitía… y también
 * permitiría cualquier script inline inyectado (un XSS). La alternativa estándar
 * es un **nonce por petición**: Next lee el nonce de la cabecera CSP que pone el
 * proxy y lo aplica a todos los scripts que renderiza, y el script del tema lo
 * recibe como prop.
 *
 * Costo aceptado: un nonce por petición obliga a renderizar en el servidor
 * (adiós a las páginas estáticas). Es el precio documentado por Next para poder
 * quitar `'unsafe-inline'` de `script-src`.
 *
 * En desarrollo se mantiene la política permisiva (`'unsafe-inline'` +
 * `'unsafe-eval'`): el HMR de Turbopack inyecta scripts sin nonce y con `eval`,
 * y no tiene sentido estorbar al entorno local. Ojo: cuando hay nonce, los
 * navegadores **ignoran** `'unsafe-inline'`, así que nunca se mezclan.
 */

export type CspOptions = {
  nonce: string;
  development: boolean;
};

/** Nonce de 128 bits en base64 (Web Crypto, válido en edge y en Node ≥18). */
export function makeNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function buildCsp({ nonce, development }: CspOptions): string {
  const scriptSrc = development
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;

  const frameAncestors = development
    ? // La preview de desarrollo se ve dentro de un iframe del entorno.
      "frame-ancestors 'self' https://*.arena.ai https://arena.ai https://*.e2b.app"
    : "frame-ancestors 'none'";

  return [
    "default-src 'self'",
    scriptSrc,
    // Los estilos sí mantienen 'unsafe-inline': React renderiza atributos
    // `style` en el HTML del servidor y no hay nonce para atributos.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    // Todo el tráfico de datos pasa por rutas propias: la llave del proveedor
    // vive en el servidor y el navegador no abre WebSocket externos.
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    frameAncestors,
  ].join("; ");
}
