/**
 * Bloqueo local de la app (clave + biométricos + recuperación). Solo en este dispositivo.
 *
 * ## Qué protege de verdad cada pieza
 *
 * El candado es una barrera de interfaz: quien pueda ejecutar JavaScript en este
 * origen puede llamar a `markUnlocked()`. Lo que protege los datos es el
 * **cifrado** de `crypto-vault.ts` (la llave maestra se envuelve con una clave
 * derivada de tu clave). Por eso el trabajo importante aquí es que la clave
 * tenga suficiente entropía y que sus verificadores no permitan atacarla
 * offline a bajo costo:
 *
 * - Verificador de clave: PBKDF2-SHA256 con **210.000 iteraciones** y salt
 *   aleatoria por dispositivo (antes: SHA-256 pelado, sin salt → un atacante con
 *   el `localStorage` probaba 4 dígitos en milisegundos).
 * - Los verificadores antiguos se migran solos la primera vez que aciertas la
 *   clave: no hay que resetear nada ni se pierde el acceso.
 * - Mínimo **6 caracteres** para claves nuevas (antes 4). Una clave de 4 dígitos
 *   son 10.000 combinaciones: eso no se arregla con más iteraciones.
 * - Los intentos fallidos y el bloqueo viven en `localStorage` (antes en
 *   `sessionStorage`, que se reinicia al abrir otra pestaña → contador infinito).
 */

const PIN_KEY = "mxcg_lock_pin_hash";
const PIN_LEN_KEY = "mxcg_lock_pin_len";
const ENABLED_KEY = "mxcg_lock_enabled";
const BIO_KEY = "mxcg_lock_bio";
const SESSION_KEY = "mxcg_lock_unlocked";
const FAIL_KEY = "mxcg_lock_fails";
const LOCKOUT_UNTIL_KEY = "mxcg_lock_until";
const LOCKOUT_ROUNDS_KEY = "mxcg_lock_rounds";
const RECOVERY_HASH_KEY = "mxcg_lock_recovery_hash";
const CONTACT_EMAIL_KEY = "mxcg_lock_email";
const CONTACT_PHONE_KEY = "mxcg_lock_phone";

const MAX_FAILS = 5;
const LOCKOUT_BASE_MS = 30_000;
const LOCKOUT_MAX_MS = 15 * 60_000;

/** Longitud mínima para claves nuevas. */
export const PIN_MIN_LENGTH = 6;
export const PIN_MAX_LENGTH = 64;
/** Longitud mínima del código de recuperación (ABCDE-FGHIJ). */
const RECOVERY_LENGTH = 10;

const VERIFIER_PREFIX = "pbkdf2";
const VERIFIER_ITERATIONS = 210_000;
const VERIFIER_MIN_ITERATIONS = 100_000;
const VERIFIER_MAX_ITERATIONS = 600_000;

/* ------------------------------- storage --------------------------------- */

function lsGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* cuota o modo privado */
  }
}

function lsRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* */
  }
}

/* ------------------------------ verifiers -------------------------------- */

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const bin = atob(text);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function pbkdf2Bits(
  secret: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number
): Promise<Uint8Array<ArrayBuffer>> {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    base,
    256
  );
  return new Uint8Array(bits);
}

/** Comparación sin salida temprana (evita filtrar por tiempo dónde falla). */
function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

/** `true` si el verificador guardado es del formato viejo (SHA-256 sin salt). */
export function isLegacyVerifier(stored: string): boolean {
  return /^[0-9a-f]{64}$/i.test(stored.trim());
}

/** Crea un verificador nuevo: `pbkdf2$<iteraciones>$<salt>$<hash>`. */
export async function createVerifier(
  secret: string,
  iterations = VERIFIER_ITERATIONS
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2Bits(secret, salt, iterations);
  return `${VERIFIER_PREFIX}$${iterations}$${toBase64(salt)}$${toBase64(hash)}`;
}

/**
 * Compara un secreto contra el verificador guardado. Acepta el formato nuevo y
 * el viejo (para poder migrar sin pedirle nada al usuario).
 */
export async function checkVerifier(
  stored: string,
  secret: string
): Promise<{ ok: boolean; legacy: boolean }> {
  if (isLegacyVerifier(stored)) {
    const hash = await sha256Hex(secret);
    return { ok: hash === stored.trim().toLowerCase(), legacy: true };
  }

  const [prefix, iterationsRaw, saltB64, hashB64] = stored.split("$");
  if (prefix !== VERIFIER_PREFIX || !iterationsRaw || !saltB64 || !hashB64) {
    return { ok: false, legacy: false };
  }
  const iterations = Number(iterationsRaw);
  if (
    !Number.isInteger(iterations) ||
    iterations < VERIFIER_MIN_ITERATIONS ||
    iterations > VERIFIER_MAX_ITERATIONS
  ) {
    return { ok: false, legacy: false };
  }
  try {
    const expected = fromBase64(hashB64);
    const actual = await pbkdf2Bits(secret, fromBase64(saltB64), iterations);
    return { ok: equalBytes(actual, expected), legacy: false };
  } catch {
    return { ok: false, legacy: false };
  }
}

function randomRecoveryCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(RECOVERY_LENGTH));
  let out = "";
  for (let i = 0; i < RECOVERY_LENGTH; i++) {
    out += chars[bytes[i]! % chars.length];
    if (i === 4) out += "-";
  }
  return out;
}

/* ------------------------------- estado ---------------------------------- */

export function isLockEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return lsGet(ENABLED_KEY) === "1" && !!lsGet(PIN_KEY);
}

/**
 * ¿La clave guardada es más corta que el mínimo actual?
 *
 * El verificador no permite saber la longitud de la clave, así que se guarda
 * solo la longitud (que no es un secreto) al fijarla o al migrarla.
 */
export function isPinWeak(): boolean {
  const len = Number(lsGet(PIN_LEN_KEY) || "0");
  return len > 0 && len < PIN_MIN_LENGTH;
}

export function isUnlockedThisSession(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markUnlocked(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* */
  }
}

export function lockNow(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* */
  }
  void import("./crypto-vault").then((v) => v.clearSessionMasterKey());
}

export function isBioPreferred(): boolean {
  return lsGet(BIO_KEY) === "1";
}

export function setBioPreferred(on: boolean): void {
  lsSet(BIO_KEY, on ? "1" : "0");
}

export function getRecoveryContacts(): { email: string; phone: string } {
  return {
    email: lsGet(CONTACT_EMAIL_KEY) || "",
    phone: lsGet(CONTACT_PHONE_KEY) || "",
  };
}

export function setRecoveryContacts(email: string, phone: string): void {
  lsSet(CONTACT_EMAIL_KEY, email.trim());
  lsSet(CONTACT_PHONE_KEY, phone.trim());
}

export function hasRecoveryCode(): boolean {
  return !!lsGet(RECOVERY_HASH_KEY);
}

/* ------------------------------- bloqueo --------------------------------- */

export function lockoutRemainingMs(): number {
  const until = Number(lsGet(LOCKOUT_UNTIL_KEY) || "0");
  return Math.max(0, until - Date.now());
}

function clearFailures(): void {
  lsRemove(FAIL_KEY);
  lsRemove(LOCKOUT_UNTIL_KEY);
  lsRemove(LOCKOUT_ROUNDS_KEY);
}

/** Suma un fallo y, si toca, aplica espera creciente (30 s → 15 min). */
function registerFailure(): void {
  const fails = Number(lsGet(FAIL_KEY) || "0") + 1;
  if (fails < MAX_FAILS) {
    lsSet(FAIL_KEY, String(fails));
    return;
  }
  const rounds = Number(lsGet(LOCKOUT_ROUNDS_KEY) || "0") + 1;
  const wait = Math.min(LOCKOUT_BASE_MS * 2 ** (rounds - 1), LOCKOUT_MAX_MS);
  lsSet(LOCKOUT_ROUNDS_KEY, String(rounds));
  lsSet(LOCKOUT_UNTIL_KEY, String(Date.now() + wait));
  lsSet(FAIL_KEY, "0");
}

/* ------------------------------- acciones -------------------------------- */

function assertPinLength(pin: string): void {
  if (pin.length < PIN_MIN_LENGTH || pin.length > PIN_MAX_LENGTH) {
    throw new Error(
      `La clave debe tener entre ${PIN_MIN_LENGTH} y ${PIN_MAX_LENGTH} caracteres`
    );
  }
}

export async function setPin(
  pin: string,
  contacts?: { email?: string; phone?: string }
): Promise<{ recoveryCode: string }> {
  assertPinLength(pin);

  lsSet(PIN_KEY, await createVerifier(`mxcg:${pin}`));
  lsSet(PIN_LEN_KEY, String(pin.length));
  lsSet(ENABLED_KEY, "1");

  const recoveryCode = randomRecoveryCode();
  lsSet(RECOVERY_HASH_KEY, await createVerifier(`mxcg-rec:${recoveryCode}`));
  clearFailures();

  if (contacts) {
    setRecoveryContacts(contacts.email || "", contacts.phone || "");
  }

  markUnlocked();
  try {
    const { unlockVaultWithPin } = await import("./crypto-vault");
    const { hydrateVaultPersist } = await import("./persist");
    await unlockVaultWithPin(pin);
    await hydrateVaultPersist();
  } catch {
    /* el candado igual queda activo */
  }
  return { recoveryCode };
}

export async function verifyPin(pin: string): Promise<boolean> {
  if (lockoutRemainingMs() > 0) return false;
  const stored = lsGet(PIN_KEY);
  if (!stored) return false;

  const { ok, legacy } = await checkVerifier(stored, `mxcg:${pin}`);
  if (!ok) {
    registerFailure();
    return false;
  }

  clearFailures();
  lsSet(PIN_LEN_KEY, String(pin.length));
  if (legacy) {
    // Migración transparente: mismo PIN, verificador con salt y PBKDF2.
    try {
      lsSet(PIN_KEY, await createVerifier(`mxcg:${pin}`));
    } catch {
      /* si falla, el verificador viejo sigue sirviendo */
    }
  }

  try {
    const { unlockVaultWithPin } = await import("./crypto-vault");
    const { hydrateVaultPersist } = await import("./persist");
    await unlockVaultWithPin(pin);
    await hydrateVaultPersist();
  } catch {
    /* PIN válido aunque el vault falle */
  }
  return true;
}

export async function resetPinWithRecovery(
  recoveryCode: string,
  newPin: string
): Promise<{ recoveryCode: string }> {
  const stored = lsGet(RECOVERY_HASH_KEY);
  if (!stored) throw new Error("No hay código de recuperación configurado");
  if (lockoutRemainingMs() > 0) {
    throw new Error("Demasiados intentos. Espera un momento.");
  }

  const normalized = recoveryCode.trim().toUpperCase().replace(/\s+/g, "");
  const { ok, legacy } = await checkVerifier(stored, `mxcg-rec:${normalized}`);
  if (!ok) {
    registerFailure();
    throw new Error("Código de recuperación incorrecto");
  }
  if (legacy) {
    try {
      lsSet(RECOVERY_HASH_KEY, await createVerifier(`mxcg-rec:${normalized}`));
    } catch {
      /* */
    }
  }
  return setPin(newPin);
}

export function disableLock(): void {
  lsRemove(PIN_KEY);
  lsRemove(PIN_LEN_KEY);
  lsRemove(ENABLED_KEY);
  lsRemove(BIO_KEY);
  lsRemove(RECOVERY_HASH_KEY);
  lsRemove(CONTACT_EMAIL_KEY);
  lsRemove(CONTACT_PHONE_KEY);
  clearFailures();
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* */
  }
}

/* ------------------------------ biométricos ------------------------------ */

export function canUseWebAuthn(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.PublicKeyCredential && navigator.credentials);
}

export async function tryBiometricUnlock(): Promise<boolean> {
  if (!canUseWebAuthn() || !isLockEnabled()) return false;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const cred = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60_000,
        userVerification: "required",
        rpId: typeof window !== "undefined" ? window.location.hostname : undefined,
      },
    });
    if (cred) {
      markUnlocked();
      return true;
    }
  } catch {
    /* cancelado */
  }
  return false;
}

export async function registerBiometric(): Promise<boolean> {
  if (!canUseWebAuthn()) return false;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: "MX Cartera Global",
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: "usuario-local",
          displayName: "Usuario",
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },
          { alg: -257, type: "public-key" },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60_000,
      },
    });
    if (cred) {
      setBioPreferred(true);
      return true;
    }
  } catch {
    /* no disponible */
  }
  return false;
}
