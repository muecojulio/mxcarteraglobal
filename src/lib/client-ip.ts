/**
 * Identificación del cliente para el límite de tasa.
 *
 * Módulo puro (sin `next/server`) para poder probarlo con `node --test`.
 *
 * ## Por qué no se usa la cadena completa de `X-Forwarded-For`
 *
 * `X-Forwarded-For` lo puede escribir quien llama y cada proxy *añade* al final
 * la dirección que ve. Las dos lecturas ingenuas fallan:
 *
 * - `split(",")[0]` (lo que hacía este repo): el primer valor es del cliente →
 *   `curl -H "X-Forwarded-For: $RANDOM"` crea un cubo nuevo por petición.
 *   Medido con el tope en 45/min: 50 peticiones rotando el header → 0 bloqueos.
 * - `split(",").pop()`: el último valor solo es fiable si *sabes* que hay un
 *   proxy de confianza delante que lo reescribe. En un despliegue sin proxy, el
 *   cliente elige el último valor igual de fácil.
 *
 * ## Modelo de confianza (fail-closed)
 *
 * 1. **Vercel** (`VERCEL=1`): su red reescribe `X-Forwarded-For` con la IP
 *    pública del cliente y no reenvía la del cliente (documentado por Vercel
 *    para prevenir IP spoofing). Ahí se usa `x-real-ip` si viene, y si no el
 *    primer salto de `x-forwarded-for`.
 * 2. **Auto-hospedado tras un proxy propio** (`TRUST_PROXY=1`): se usa el
 *    **último** salto, que es el que añadió ese proxy.
 * 3. **Cualquier otro caso (producción sin proxy declarado)**: no se confía en
 *    ninguna cabecera y todos comparten un único cubo (`"shared"`). Es a
 *    propósito: prefiero que un atacante se limite a sí mismo consumiendo el
 *    cubo común (1 minuto) a que pueda crear cubos infinitos y quemar la cuota
 *    de las fuentes de datos, que es lo que el límite protege.
 * 4. **Desarrollo** (`development: true`): se usa el último salto. Un servidor de
 *    desarrollo está para probar y su preview pasa por proxies que sí añaden la
 *    IP real al final; exigir configuración ahí solo entorpecería las pruebas.
 *    En producción la rama 3 sigue siendo la que aplica por defecto.
 */

/** Forma de una IPv4 o IPv6 plausible: solo dígitos, hex, puntos y dos puntos. */
const IP_SHAPE = /^[0-9a-fA-F:.]{3,45}$/;

/** Cubo compartido cuando no hay una IP de confianza. */
export const SHARED_BUCKET = "shared";

export type ClientIpInput = {
  /** Valor crudo de `x-forwarded-for`. */
  forwardedFor?: string | null;
  /** Valor crudo de `x-real-ip`. */
  realIp?: string | null;
  /** `process.env.VERCEL === "1"`. */
  onVercel?: boolean;
  /** `process.env.TRUST_PROXY === "1"` (auto-hospedado con proxy propio). */
  trustProxyHop?: boolean;
  /** `process.env.NODE_ENV !== "production"`. */
  development?: boolean;
};

/** Valida que el texto tenga forma de IP; si no, no sirve como clave. */
export function normalizeIp(value: string | null | undefined): string | null {
  const ip = value?.trim();
  if (!ip || !IP_SHAPE.test(ip)) return null;
  return ip;
}

/** Primer valor de la lista (el más cercano al cliente). */
export function firstHop(forwardedFor: string | null | undefined): string | null {
  if (!forwardedFor) return null;
  const parts = forwardedFor.split(",").map((p) => p.trim()).filter(Boolean);
  return normalizeIp(parts[0]);
}

/** Último valor de la lista (el que añadió el último proxy). */
export function lastHop(forwardedFor: string | null | undefined): string | null {
  if (!forwardedFor) return null;
  const parts = forwardedFor.split(",").map((p) => p.trim()).filter(Boolean);
  return normalizeIp(parts[parts.length - 1]);
}

/**
 * Clave del cubo de límite de tasa. Devuelve `SHARED_BUCKET` cuando no hay
 * ninguna IP en la que se pueda confiar.
 */
export function resolveClientKey(input: ClientIpInput): string {
  const { forwardedFor, realIp, onVercel, trustProxyHop, development } = input;

  if (onVercel) {
    // Vercel escribe `x-real-ip` y reescribe `x-forwarded-for`; ambos son del
    // borde, no del cliente.
    return normalizeIp(realIp) ?? firstHop(forwardedFor) ?? SHARED_BUCKET;
  }

  if (trustProxyHop || development) {
    return lastHop(forwardedFor) ?? normalizeIp(realIp) ?? SHARED_BUCKET;
  }

  return SHARED_BUCKET;
}
