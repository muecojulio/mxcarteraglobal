/**
 * Migración de una instalación "antigua" (verificador SHA-256 sin salt y
 * paquete de llave con 120.000 iteraciones) al formato nuevo.
 *
 * Es la parte más delicada del endurecimiento: si la migración falla, el usuario
 * se queda fuera de su propia bóveda. Se prueba sin navegador con un shim de
 * localStorage/sessionStorage.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

/* ------------------------------ shims ------------------------------------ */

function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
    _dump: () => Object.fromEntries(map),
  };
}

const local = makeStorage();
const session = makeStorage();
globalThis.window = { localStorage: local, location: { hostname: "localhost" } };
globalThis.localStorage = local;
globalThis.sessionStorage = session;

const { verifyPin, setPin, lockoutRemainingMs, isPinWeak, PIN_MIN_LENGTH } =
  await import("../src/lib/app-lock.ts");
const { encryptText, decryptText } = await import("../src/lib/crypto-vault.ts");

/* --------------------------- helpers legacy ------------------------------ */

function b64(buf) {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
}

async function legacySha256(text) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Paquete de llave en el formato viejo: `<iv>.<ct>` con 120.000 iteraciones. */
async function legacyWrapKey(rawMk, pin, salt) {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`mxcg-vault:${pin}`),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 120_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, rawMk);
  return `${b64(iv)}.${b64(ct)}`;
}

async function installLegacy(pin) {
  // Estado limpio: una instalación antigua no tiene longitud registrada ni
  // contadores de intentos.
  for (const key of [
    "mxcg_lock_pin_len",
    "mxcg_lock_fails",
    "mxcg_lock_until",
    "mxcg_lock_rounds",
  ]) {
    local.removeItem(key);
  }
  local.setItem("mxcg_lock_enabled", "1");
  local.setItem("mxcg_lock_pin_hash", await legacySha256(`mxcg:${pin}`));
  local.setItem("mxcg_lock_recovery_hash", await legacySha256("mxcg-rec:ABCDE-FGHIJ"));

  const masterKey = crypto.getRandomValues(new Uint8Array(32));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  local.setItem("mxcg_vault_salt", b64(salt));
  local.setItem("mxcg_vault_wrap", await legacyWrapKey(masterKey, pin, salt));
  return masterKey;
}

/* ------------------------------- pruebas --------------------------------- */

test("al desbloquear una instalación antigua se migran verificador y paquete", async () => {
  const masterKey = await installLegacy("1234");
  const before = { ...local._dump() };
  assert.match(before.mxcg_lock_pin_hash, /^[0-9a-f]{64}$/);
  assert.match(before.mxcg_vault_wrap, /^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/);

  assert.equal(await verifyPin("1234"), true);

  const after = local._dump();
  assert.match(after.mxcg_lock_pin_hash, /^pbkdf2\$210000\$/);
  assert.match(after.mxcg_vault_wrap, /^p2\$210000\$/);
  assert.equal(after.mxcg_lock_pin_len, "4", "se registra la longitud para avisar");

  // La llave maestra debe ser la misma: la migración re-envuelve, no regenera.
  const { getSessionMasterKey } = await import("../src/lib/crypto-vault.ts");
  assert.deepEqual(getSessionMasterKey(), masterKey);

  // Y el dato cifrado antes sigue leyéndose con esa llave.
  const blob = await encryptText("cartera-de-prueba", masterKey);
  assert.equal(await decryptText(blob, getSessionMasterKey()), "cartera-de-prueba");
});

test("la clave corta se marca como débil sin romper el acceso", async () => {
  await installLegacy("4321");
  assert.equal(isPinWeak(), false, "aún no se conoce la longitud");
  assert.equal(await verifyPin("4321"), true);
  assert.equal(isPinWeak(), true);
  assert.equal(PIN_MIN_LENGTH, 6);
});

test("clave incorrecta no migra nada y los intentos se acumulan", async () => {
  await installLegacy("9999");
  const legacyPin = local.getItem("mxcg_lock_pin_hash");
  assert.equal(await verifyPin("1111"), false);
  assert.equal(local.getItem("mxcg_lock_pin_hash"), legacyPin, "no se migra sin acertar");
  assert.equal(local.getItem("mxcg_lock_fails"), "1", "se cuenta en localStorage");

  // Cuatro fallos más → bloqueo (persistente, no por pestaña).
  for (let i = 0; i < 4; i++) await verifyPin("1111");
  assert.ok(lockoutRemainingMs() > 0, "debe haber espera tras 5 fallos");
  assert.equal(await verifyPin("9999"), false, "con bloqueo activo no se acepta ni la correcta");
});

test("setPin exige el mínimo nuevo y deja todo en formato actual", async () => {
  local._dump();
  for (const key of Object.keys(local._dump())) local.removeItem(key);

  await assert.rejects(() => setPin("1234"), /entre 6 y 64/);
  const { recoveryCode } = await setPin("cartera-2026");
  assert.match(local.getItem("mxcg_lock_pin_hash"), /^pbkdf2\$210000\$/);
  assert.match(local.getItem("mxcg_lock_recovery_hash"), /^pbkdf2\$210000\$/);
  assert.match(local.getItem("mxcg_vault_wrap"), /^p2\$210000\$/);
  assert.match(recoveryCode, /^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
  assert.equal(await verifyPin("cartera-2026"), true);
});

test("reabrir el vault migrado en otra sesión sigue funcionando", async () => {
  // Sesión nueva: se pierde la llave en sessionStorage y se abre con la clave.
  session.removeItem("mxcg_vault_mk");
  const { getSessionMasterKey, encryptText: enc } = await import(
    "../src/lib/crypto-vault.ts"
  );
  assert.equal(getSessionMasterKey(), null);
  assert.equal(await verifyPin("cartera-2026"), true);
  const mk = getSessionMasterKey();
  assert.ok(mk, "la llave maestra se recupera de la clave");

  // Persistencia real: cifrar y volver a leer con la misma llave.
  const blob = await enc("posiciones", mk);
  assert.equal(await decryptText(blob, mk), "posiciones");
});
