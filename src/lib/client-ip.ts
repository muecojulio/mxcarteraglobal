/**
 * Identificación del cliente para el límite de tasa.
 *
 * Vive en su propio módulo (sin importar `next/server`) para poder probarlo
 * con `node --test` sin levantar el runtime de Next.
 */

/** Forma de una IPv4 o IPv6 plausible: solo dígitos, hex, puntos y dos puntos. */
const IP_SHAPE = /^[0-9a-fA-F:.]{3,45}$/;

/**
 * IP real del cliente a partir de la cabecera `X-Forwarded-For`.
 *
 * Se usa el **último** valor de la cadena, no el primero. Los proxies (Vercel
 * incluido) *añaden* al final la IP que ellos ven; lo que el cliente manda
 * queda a la izquierda y es falsificable:
 *
 *     curl -H "X-Forwarded-For: 9.9.9.9" https://<app>/api/quote
 *
 * Medido antes de este cambio, con el límite en 45/min: 50 peticiones con un
 * XFF fijo → `429` desde la 46; las mismas 50 rotando el XFF falso → cero
 * bloqueos. Tomando el último salto, rotar el header ya no crea clientes
 * nuevos y el contador vuelve a ser por IP real.
 *
 * Devuelve `null` si no hay cadena o si el valor no tiene forma de IP (así un
 * valor arbitrario y larguísimo no se convierte en clave del `Map`).
 */
export function clientKeyFromForwardedFor(xff: string | null | undefined): string | null {
  if (!xff) return null;
  // `Headers.get` une varias cabeceras con ", ", así que esto también cubre el
  // caso de cabeceras repetidas.
  const parts = xff.split(",").map((part) => part.trim()).filter(Boolean);
  const last = parts[parts.length - 1];
  if (!last || !IP_SHAPE.test(last)) return null;
  return last;
}

/**
 * `x-real-ip` como último recurso (lo pone nginx/Cloudflare; Vercel no).
 * Es un respaldo, no una fuente de confianza: se acepta solo si tiene forma
 * de IP.
 */
export function clientKeyFromRealIp(realIp: string | null | undefined): string | null {
  const value = realIp?.trim();
  if (!value || !IP_SHAPE.test(value)) return null;
  return value;
}
