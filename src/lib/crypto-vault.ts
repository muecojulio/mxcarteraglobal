/**
 * Cifrado local AES-GCM. La llave maestra se abre con el PIN
 * y vive solo en sessionStorage mientras la app está desbloqueada.
 */

const MK_WRAP = "mxcg_vault_wrap";
const MK_SALT = "mxcg_vault_salt";
const MK_SESSION = "mxcg_vault_mk";
const DEVICE_WRAP = "mxcg_vault_device"; // si aún no hay PIN
const ENC_PREFIX = "ENC1.";

function b64(buf: ArrayBuffer | Uint8Array<ArrayBuffer>): string {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
}

function unb64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

async function derivePinKey(pin: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`mxcg-vault:${pin}`),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 120_000,
      hash: "SHA-256",
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function importAesRaw(raw: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, "AES-GCM", true, [
    "encrypt",
    "decrypt",
  ]);
}

export async function generateMasterKeyRaw(): Promise<Uint8Array<ArrayBuffer>> {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  return raw;
}

export function isEncryptedBlob(text: string | null | undefined): boolean {
  return !!text && text.startsWith(ENC_PREFIX);
}

export async function encryptText(plain: string, rawKey: Uint8Array<ArrayBuffer>): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importAesRaw(rawKey);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plain)
  );
  return ENC_PREFIX + b64(iv) + "." + b64(ct);
}

export async function decryptText(
  blob: string,
  rawKey: Uint8Array<ArrayBuffer>
): Promise<string> {
  if (!isEncryptedBlob(blob)) return blob;
  const parts = blob.slice(ENC_PREFIX.length).split(".");
  if (parts.length !== 2) throw new Error("Blob inválido");
  const iv = unb64(parts[0]);
  const ct = unb64(parts[1]);
  const key = await importAesRaw(rawKey);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

export function getSessionMasterKey(): Uint8Array<ArrayBuffer> | null {
  if (typeof window === "undefined") return null;
  const s = sessionStorage.getItem(MK_SESSION);
  if (!s) return null;
  try {
    return unb64(s);
  } catch {
    return null;
  }
}

export function setSessionMasterKey(raw: Uint8Array<ArrayBuffer>): void {
  sessionStorage.setItem(MK_SESSION, b64(raw));
}

export function clearSessionMasterKey(): void {
  sessionStorage.removeItem(MK_SESSION);
}

async function wrapKey(rawMk: Uint8Array<ArrayBuffer>, wrapKey: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrapKey,
    rawMk
  );
  return b64(iv) + "." + b64(ct);
}

async function unwrapKey(pack: string, wrapKey: CryptoKey): Promise<Uint8Array<ArrayBuffer>> {
  const [ivB, ctB] = pack.split(".");
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(ivB) },
    wrapKey,
    unb64(ctB)
  );
  return new Uint8Array(pt);
}

function getSalt(): Uint8Array<ArrayBuffer> {
  let s = localStorage.getItem(MK_SALT);
  if (!s) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    localStorage.setItem(MK_SALT, b64(salt));
    return salt;
  }
  return unb64(s);
}

/** Abre o crea la llave maestra con el PIN y la deja en sesión. */
export async function unlockVaultWithPin(pin: string): Promise<void> {
  const salt = getSalt();
  const pinKey = await derivePinKey(pin, salt);
  const wrapped = localStorage.getItem(MK_WRAP);
  if (wrapped) {
    const mk = await unwrapKey(wrapped, pinKey);
    setSessionMasterKey(mk);
    return;
  }
  // ¿había llave de dispositivo?
  const device = localStorage.getItem(DEVICE_WRAP);
  let mk: Uint8Array<ArrayBuffer>;
  if (device) {
    mk = unb64(device);
  } else {
    mk = await generateMasterKeyRaw();
  }
  const pack = await wrapKey(mk, pinKey);
  localStorage.setItem(MK_WRAP, pack);
  localStorage.removeItem(DEVICE_WRAP);
  setSessionMasterKey(mk);
}

/** Sin PIN: llave de dispositivo (mejor que texto plano, no es caja fuerte). */
export async function ensureDeviceVault(): Promise<Uint8Array<ArrayBuffer>> {
  const existing = getSessionMasterKey();
  if (existing) return existing;
  let device = localStorage.getItem(DEVICE_WRAP);
  if (!device) {
    const mk = await generateMasterKeyRaw();
    localStorage.setItem(DEVICE_WRAP, b64(mk));
    setSessionMasterKey(mk);
    return mk;
  }
  const raw = unb64(device);
  setSessionMasterKey(raw);
  return raw;
}

export function hasWrappedVault(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(MK_WRAP) || !!localStorage.getItem(DEVICE_WRAP);
}

export function vaultStatus(): "session" | "wrapped" | "device" | "none" {
  if (typeof window === "undefined") return "none";
  if (sessionStorage.getItem(MK_SESSION)) return "session";
  if (localStorage.getItem(MK_WRAP)) return "wrapped";
  if (localStorage.getItem(DEVICE_WRAP)) return "device";
  return "none";
}

export function clearVaultMeta(): void {
  localStorage.removeItem(MK_WRAP);
  localStorage.removeItem(DEVICE_WRAP);
  sessionStorage.removeItem(MK_SESSION);
}
