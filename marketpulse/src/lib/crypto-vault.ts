const ENC_PREFIX = "ENC1.";
const MK_SESSION = "mxcg_vault_mk";
function b64(buf: ArrayBuffer | Uint8Array): string {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = ""; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
}
function unb64(s: string): Uint8Array {
  const bin = atob(s); const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}
async function importAesRaw(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, "AES-GCM", true, ["encrypt", "decrypt"]);
}
export function isEncryptedBlob(text: string | null | undefined): boolean {
  return !!text && text.startsWith(ENC_PREFIX);
}
export async function encryptText(plain: string, rawKey: Uint8Array): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importAesRaw(rawKey);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  return ENC_PREFIX + b64(iv) + "." + b64(ct);
}
export async function decryptText(blob: string, rawKey: Uint8Array): Promise<string> {
  if (!isEncryptedBlob(blob)) return blob;
  const parts = blob.slice(ENC_PREFIX.length).split(".");
  const iv = unb64(parts[0]); const ct = unb64(parts[1]);
  const key = await importAesRaw(rawKey);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}
export function clearSessionMasterKey(): void {
  try { sessionStorage.removeItem(MK_SESSION); } catch { /* */ }
}
export async function unlockVaultWithPin(_pin: string): Promise<void> { /* PIN abre sesión; persist hidrata aparte */ }
