const PIN_KEY = "mxcg_lock_pin_hash";
const ENABLED_KEY = "mxcg_lock_enabled";
const BIO_KEY = "mxcg_lock_bio";
const SESSION_KEY = "mxcg_lock_unlocked";
const FAIL_KEY = "mxcg_lock_fails";
const LOCKOUT_UNTIL_KEY = "mxcg_lock_until";
const MAX_FAILS = 5;
const LOCKOUT_MS = 30_000;
const RECOVERY_HASH_KEY = "mxcg_lock_recovery_hash";
const CONTACT_EMAIL_KEY = "mxcg_lock_email";
const CONTACT_PHONE_KEY = "mxcg_lock_phone";

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function randomRecoveryCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let out = "";
  for (let i = 0; i < 10; i++) { out += chars[bytes[i] % chars.length]; if (i === 4) out += "-"; }
  return out;
}
export function isLockEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ENABLED_KEY) === "1" && !!localStorage.getItem(PIN_KEY);
}
export function isUnlockedThisSession(): boolean {
  if (typeof window === "undefined") return true;
  return sessionStorage.getItem(SESSION_KEY) === "1";
}
export function markUnlocked(): void { sessionStorage.setItem(SESSION_KEY, "1"); }
export function lockNow(): void {
  sessionStorage.removeItem(SESSION_KEY);
  void import("./crypto-vault").then((v) => v.clearSessionMasterKey());
}
export function isBioPreferred(): boolean { return localStorage.getItem(BIO_KEY) === "1"; }
export function setBioPreferred(on: boolean): void { localStorage.setItem(BIO_KEY, on ? "1" : "0"); }
export function getRecoveryContacts(): { email: string; phone: string } {
  return { email: localStorage.getItem(CONTACT_EMAIL_KEY) || "", phone: localStorage.getItem(CONTACT_PHONE_KEY) || "" };
}
export function setRecoveryContacts(email: string, phone: string): void {
  localStorage.setItem(CONTACT_EMAIL_KEY, email.trim());
  localStorage.setItem(CONTACT_PHONE_KEY, phone.trim());
}
export async function setPin(pin: string, contacts?: { email?: string; phone?: string }): Promise<{ recoveryCode: string }> {
  if (pin.length < 4 || pin.length > 12) throw new Error("La clave debe tener entre 4 y 12 caracteres");
  localStorage.setItem(PIN_KEY, await sha256(`mxcg:${pin}`));
  localStorage.setItem(ENABLED_KEY, "1");
  const recoveryCode = randomRecoveryCode();
  localStorage.setItem(RECOVERY_HASH_KEY, await sha256(`mxcg-rec:${recoveryCode}`));
  if (contacts) setRecoveryContacts(contacts.email || "", contacts.phone || "");
  markUnlocked();
  return { recoveryCode };
}
export function lockoutRemainingMs(): number {
  return Math.max(0, Number(sessionStorage.getItem(LOCKOUT_UNTIL_KEY) || "0") - Date.now());
}
export async function verifyPin(pin: string): Promise<boolean> {
  if (lockoutRemainingMs() > 0) return false;
  const stored = localStorage.getItem(PIN_KEY);
  if (!stored) return false;
  if ((await sha256(`mxcg:${pin}`)) === stored) {
    sessionStorage.removeItem(FAIL_KEY);
    sessionStorage.removeItem(LOCKOUT_UNTIL_KEY);
    return true;
  }
  const fails = Number(sessionStorage.getItem(FAIL_KEY) || "0") + 1;
  sessionStorage.setItem(FAIL_KEY, String(fails));
  if (fails >= MAX_FAILS) {
    sessionStorage.setItem(LOCKOUT_UNTIL_KEY, String(Date.now() + LOCKOUT_MS));
    sessionStorage.setItem(FAIL_KEY, "0");
  }
  return false;
}
export function disableLock(): void {
  [PIN_KEY, ENABLED_KEY, BIO_KEY, RECOVERY_HASH_KEY, CONTACT_EMAIL_KEY, CONTACT_PHONE_KEY].forEach((k) => localStorage.removeItem(k));
  sessionStorage.removeItem(SESSION_KEY);
}
export function canUseWebAuthn(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.PublicKeyCredential && navigator.credentials);
}
export async function registerBiometric(): Promise<boolean> {
  if (!canUseWebAuthn()) return false;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));
    await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "MX Cartera Global", id: window.location.hostname },
        user: { id: userId, name: "local", displayName: "MXCG" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
        timeout: 60_000,
        authenticatorSelection: { userVerification: "required" },
      },
    });
    setBioPreferred(true);
    return true;
  } catch { return false; }
}
