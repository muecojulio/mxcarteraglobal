import { collectSyncPayload, applySyncPayload, persistGetString, persistSetString } from "./persist";
async function cloudKeyFromPass(pass: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey("raw", enc.encode(`mxcg-cloud:${pass}`), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: enc.encode("mxcg-cloud-salt-v1"), iterations: 120_000, hash: "SHA-256" }, base, 256);
  return new Uint8Array(bits);
}
const SYNC_ID_KEY = "mxcg_sync_id";
const SYNC_AT_KEY = "mxcg_sync_at";
export function getSyncId(): string | null { return persistGetString(SYNC_ID_KEY) || localStorage.getItem(SYNC_ID_KEY); }
export function getLastSyncAt(): string | null { return localStorage.getItem(SYNC_AT_KEY); }
export type SyncEnvelope = { v: 1; app: "MX Cartera Global"; updatedAt: string; blob: string };
export async function buildEnvelope(pass: string): Promise<SyncEnvelope> {
  const { encryptText } = await import("./crypto-vault");
  const mk = await cloudKeyFromPass(pass);
  const payload = JSON.stringify({ updatedAt: new Date().toISOString(), data: collectSyncPayload() });
  const blob = await encryptText(payload, mk);
  return { v: 1, app: "MX Cartera Global", updatedAt: new Date().toISOString(), blob };
}
export async function applyEnvelope(env: SyncEnvelope, pass: string): Promise<void> {
  const { decryptText } = await import("./crypto-vault");
  const mk = await cloudKeyFromPass(pass);
  const raw = await decryptText(env.blob, mk);
  const parsed = JSON.parse(raw) as { data: Record<string, string | null> };
  applySyncPayload(parsed.data || {});
}
export async function pushCloud(pass: string): Promise<{ id: string }> {
  if (!pass || pass.length < 4) throw new Error("Escribe una clave de nube (mín. 4)");
  const env = await buildEnvelope(pass);
  const id = getSyncId();
  const res = await fetch("/api/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, envelope: env }) });
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
  await applyEnvelope(json.envelope as SyncEnvelope, pass);
  localStorage.setItem(SYNC_ID_KEY, useId);
  persistSetString(SYNC_ID_KEY, useId);
  localStorage.setItem(SYNC_AT_KEY, new Date().toISOString());
}
