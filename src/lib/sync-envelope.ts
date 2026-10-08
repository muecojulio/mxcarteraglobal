/**
 * Forma del sobre del respaldo en la nube. Una sola definición, compartida por
 * el cliente (`cloud-sync.ts`) y la ruta `/api/sync`.
 *
 * Sin dependencias de Next ni del navegador, para poder probarse con
 * `node --test`.
 */

export const KDF_HASH = "SHA-256" as const;
export const KDF_ITERATIONS = 120_000;
/** Rango aceptado al leer: un `iterations` enorme colgaría el navegador. */
export const KDF_MIN_ITERATIONS = 100_000;
export const KDF_MAX_ITERATIONS = 600_000;

/** Tope del blob cifrado (base64 de la cartera: sobra por mucho). */
export const MAX_ENVELOPE_CHARS = 512 * 1024;
/** Tope del cuerpo HTTP completo, con margen para el resto del JSON. */
export const MAX_BODY_BYTES = MAX_ENVELOPE_CHARS + 8 * 1024;

/** Salt fija de la versión 1. Solo para descifrar sobres antiguos. */
export const LEGACY_SALT = "mxcg-cloud-salt-v1";

const SALT_RE = /^[A-Za-z0-9+/=]{16,64}$/;

/** Sobre actual: salt aleatoria propia + parámetros de KDF explícitos. */
export type SyncEnvelope = {
  v: 2;
  app: "MX Cartera Global";
  updatedAt: string;
  /** Salt aleatoria de 16 bytes en base64, única por respaldo. */
  salt: string;
  kdf: { name: "PBKDF2"; hash: typeof KDF_HASH; iterations: number };
  blob: string;
};

/** Sobre de la versión 1 (salt fija). Se sigue leyendo para no romper respaldos ya subidos. */
export type LegacySyncEnvelope = {
  v: 1;
  app: "MX Cartera Global";
  updatedAt: string;
  blob: string;
};

export type AnySyncEnvelope = SyncEnvelope | LegacySyncEnvelope;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function validIterations(value: unknown): value is number {
  const n = Number(value);
  return (
    Number.isInteger(n) && n >= KDF_MIN_ITERATIONS && n <= KDF_MAX_ITERATIONS
  );
}

function validBlob(value: unknown): value is string {
  return (
    typeof value === "string" && value.length > 0 && value.length <= MAX_ENVELOPE_CHARS
  );
}

/** Validación al **leer** un respaldo (cliente). Acepta v1 y v2. */
export function isSyncEnvelope(value: unknown): value is AnySyncEnvelope {
  if (!isRecord(value)) return false;
  if (!validBlob(value.blob)) return false;
  if (value.v === 1) return true;
  if (value.v !== 2) return false;
  if (typeof value.salt !== "string" || !SALT_RE.test(value.salt)) return false;
  const kdf = value.kdf;
  if (!isRecord(kdf) || !validIterations(kdf.iterations)) return false;
  return true;
}

/**
 * Validación y normalización al **subir** (servidor).
 *
 * Devuelve solo los campos conocidos: lo que el cliente mande de más no viaja a
 * la nube, y un `blob` gigantesco se rechaza aquí además del tope del cuerpo.
 */
export function cleanEnvelopeForUpload(
  value: unknown
): SyncEnvelope | LegacySyncEnvelope | null {
  if (!isRecord(value)) return null;
  if (!validBlob(value.blob)) return null;

  // La app no es configurable: se fija, no se copia del cliente.
  const app = "MX Cartera Global" as const;
  const updatedAt =
    typeof value.updatedAt === "string"
      ? value.updatedAt.slice(0, 40)
      : new Date().toISOString();

  if (value.v === 1) {
    return { v: 1, app, updatedAt, blob: value.blob };
  }
  if (value.v !== 2) return null;

  if (typeof value.salt !== "string" || !SALT_RE.test(value.salt)) return null;
  const kdf = value.kdf;
  if (!isRecord(kdf) || !validIterations(kdf.iterations)) return null;

  return {
    v: 2,
    app,
    updatedAt,
    salt: value.salt,
    kdf: { name: "PBKDF2", hash: KDF_HASH, iterations: Number(kdf.iterations) },
    blob: value.blob,
  };
}
