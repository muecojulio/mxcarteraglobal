import {
  collectSyncPayload,
  applySyncPayload,
  persistGetString,
  persistSetString,
} from "./persist";
import {
  KDF_HASH,
  KDF_ITERATIONS,
  LEGACY_SALT,
  isSyncEnvelope,
  type AnySyncEnvelope,
  type SyncEnvelope,
} from "./sync-envelope";

export { isSyncEnvelope };
export type { AnySyncEnvelope, LegacySyncEnvelope, SyncEnvelope } from "./sync-envelope";

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

async function cloudKeyFromPass(
  pass: string,
  saltB64?: string,
  iterations: number = KDF_ITERATIONS
): Promise<Uint8Array<ArrayBuffer>> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey(
    "raw",
    enc.encode(`mxcg-cloud:${pass}`),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      // v2: salt aleatoria por respaldo, guardada en el sobre. v1 (y cualquier
      // respaldo previo): la salt fija compartida, que permitía precomputar.
      salt: saltB64 ? fromBase64(saltB64) : enc.encode(LEGACY_SALT),
      iterations,
      hash: KDF_HASH,
    },
    base,
    256
  );
  return new Uint8Array(bits);
}

const SYNC_ID_KEY = "mxcg_sync_id";
const SYNC_AT_KEY = "mxcg_sync_at";

export function getSyncId(): string | null {
  return persistGetString(SYNC_ID_KEY) || localStorage.getItem(SYNC_ID_KEY);
}

export function getLastSyncAt(): string | null {
  return localStorage.getItem(SYNC_AT_KEY);
}

export async function buildEnvelope(pass: string): Promise<SyncEnvelope> {
  const { encryptText } = await import("./crypto-vault");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const mk = await cloudKeyFromPass(pass, toBase64(salt));
  const payload = JSON.stringify({
    updatedAt: new Date().toISOString(),
    data: collectSyncPayload(),
  });
  const blob = await encryptText(payload, mk);
  return {
    v: 2,
    app: "MX Cartera Global",
    updatedAt: new Date().toISOString(),
    salt: toBase64(salt),
    kdf: { name: "PBKDF2", hash: KDF_HASH, iterations: KDF_ITERATIONS },
    blob,
  };
}

export async function applyEnvelope(
  env: AnySyncEnvelope,
  pass: string
): Promise<void> {
  const { decryptText } = await import("./crypto-vault");
  const saltB64 = env.v === 2 ? env.salt : undefined;
  const iterations = env.v === 2 ? env.kdf.iterations : KDF_ITERATIONS;
  const mk = await cloudKeyFromPass(pass, saltB64, iterations);
  const raw = await decryptText(env.blob, mk);
  const parsed = JSON.parse(raw) as {
    data: Record<string, string | null>;
  };
  applySyncPayload(parsed.data || {});
}

export async function pushCloud(pass: string): Promise<{ id: string }> {
  if (!pass || pass.length < 4) throw new Error("Escribe una clave de nube (mín. 4)");
  const env = await buildEnvelope(pass);
  const id = getSyncId();
  const res = await fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, envelope: env }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "No se pudo subir");
  localStorage.setItem(SYNC_ID_KEY, json.id);
  persistSetString(SYNC_ID_KEY, json.id);
  localStorage.setItem(SYNC_AT_KEY, new Date().toISOString());
  return { id: json.id };
}

export async function pullCloud(id?: string, pass?: string): Promise<void> {
  if (!pass || pass.length < 4) throw new Error("Escribe la misma clave de nube");
  const useId = (id || getSyncId() || "").trim();
  if (!useId) throw new Error("No hay ID de nube");
  const res = await fetch(`/api/sync?id=${encodeURIComponent(useId)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "No se pudo bajar");
  if (!isSyncEnvelope(json.envelope)) {
    throw new Error("El respaldo no tiene el formato esperado");
  }
  await applyEnvelope(json.envelope, pass);
  localStorage.setItem(SYNC_ID_KEY, useId);
  persistSetString(SYNC_ID_KEY, useId);
  localStorage.setItem(SYNC_AT_KEY, new Date().toISOString());
}
