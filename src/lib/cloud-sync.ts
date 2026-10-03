const SYNC_ID_KEY = "mxcg_sync_id";
const SYNC_AT_KEY = "mxcg_sync_at";
export function getSyncId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SYNC_ID_KEY);
}
export function getLastSyncAt(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SYNC_AT_KEY);
}
export type SyncEnvelope = { v: 1; app: "MX Cartera Global"; updatedAt: string; blob: string };
