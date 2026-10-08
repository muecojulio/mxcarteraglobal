import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildEnvelope,
  applyEnvelope,
  isSyncEnvelope,
} from "../src/lib/cloud-sync.ts";
import { cleanEnvelopeForUpload } from "../src/lib/sync-envelope.ts";
import { encryptText } from "../src/lib/crypto-vault.ts";
import { persistSetString, persistGetString, PERSIST_KEYS } from "../src/lib/persist.ts";

const PASS = "clave-de-prueba-2026";

/** Salt fija de la versión 1 (el formato que ya está subido en la nube). */
const LEGACY_SALT = "mxcg-cloud-salt-v1";

async function legacyKey(pass) {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey(
    "raw",
    enc.encode(`mxcg-cloud:${pass}`),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(LEGACY_SALT), iterations: 120_000, hash: "SHA-256" },
    base,
    256
  );
  return new Uint8Array(bits);
}

test("push → pull conserva los datos (sobre v2)", async () => {
  persistSetString(PERSIST_KEYS.watchlist, JSON.stringify(["AMXL.MX", "AAPL"]));
  persistSetString(PERSIST_KEYS.positions, JSON.stringify([{ symbol: "AAPL", quantity: 3 }]));

  const env = await buildEnvelope(PASS);
  assert.equal(env.v, 2);
  assert.match(env.salt, /^[A-Za-z0-9+/=]{16,64}$/);
  assert.equal(env.kdf.iterations, 120_000);
  assert.ok(isSyncEnvelope(env), "el sobre propio debe validarse");

  // Simula "otro dispositivo": limpia la memoria del lado del cliente.
  persistSetString(PERSIST_KEYS.watchlist, JSON.stringify([]));
  persistSetString(PERSIST_KEYS.positions, JSON.stringify([]));

  await applyEnvelope(env, PASS);
  assert.equal(persistGetString(PERSIST_KEYS.watchlist), JSON.stringify(["AMXL.MX", "AAPL"]));
  assert.equal(
    persistGetString(PERSIST_KEYS.positions),
    JSON.stringify([{ symbol: "AAPL", quantity: 3 }])
  );
});

test("dos respaldos con la MISMA clave usan sales distintas (no hay salt fija)", async () => {
  const a = await buildEnvelope(PASS);
  const b = await buildEnvelope(PASS);
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.blob, b.blob);

  // Y cada uno se abre con su propia salt.
  await applyEnvelope(a, PASS);
  await applyEnvelope(b, PASS);
});

test("los sobres v1 ya subidos se siguen leyendo (compatibilidad)", async () => {
  const payload = JSON.stringify({
    updatedAt: new Date().toISOString(),
    data: { [PERSIST_KEYS.alerts]: JSON.stringify([{ symbol: "WALMEX.MX", target: 60 }]) },
  });
  const legacy = {
    v: 1,
    app: "MX Cartera Global",
    updatedAt: new Date().toISOString(),
    blob: await encryptText(payload, await legacyKey(PASS)),
  };
  assert.ok(isSyncEnvelope(legacy));

  persistSetString(PERSIST_KEYS.alerts, JSON.stringify([]));
  await applyEnvelope(legacy, PASS);
  assert.equal(
    persistGetString(PERSIST_KEYS.alerts),
    JSON.stringify([{ symbol: "WALMEX.MX", target: 60 }])
  );
});

test("con la clave equivocada no se descifra", async () => {
  const env = await buildEnvelope(PASS);
  await assert.rejects(() => applyEnvelope(env, "otra-clave-distinta"));
});

test("isSyncEnvelope filtra sobres mal formados o abusivos", () => {
  const base = { app: "MX Cartera Global", updatedAt: "2026-01-01T00:00:00.000Z", blob: "ENC1.a.b" };
  assert.ok(isSyncEnvelope({ ...base, v: 2, salt: "AAAAAAAAAAAAAAAAAAAAAA==", kdf: { iterations: 120_000 } }));

  assert.equal(isSyncEnvelope(null), false);
  assert.equal(isSyncEnvelope({ ...base, v: 3 }), false);
  assert.equal(isSyncEnvelope({ ...base, v: 1, blob: "" }), false);
  assert.equal(isSyncEnvelope({ ...base, v: 2 }), false, "v2 sin salt");
  assert.equal(
    isSyncEnvelope({ ...base, v: 2, salt: "corta", kdf: { iterations: 120_000 } }),
    false
  );
  assert.equal(
    isSyncEnvelope({ ...base, v: 2, salt: "AAAAAAAAAAAAAAAAAAAAAA==", kdf: { iterations: 1e9 } }),
    false,
    "iterations enormes (colgaría el navegador al leer)"
  );
  assert.equal(
    isSyncEnvelope({ ...base, v: 2, salt: "AAAAAAAAAAAAAAAAAAAAAA==", kdf: { iterations: 1000 } }),
    false,
    "iterations demasiado bajas"
  );
});

test("cleanEnvelopeForUpload: solo pasan los campos conocidos", () => {
  const raw = {
    v: 2,
    app: "MX Cartera Global",
    updatedAt: "2026-10-08T00:00:00.000Z",
    salt: "q1w2e3r4t5y6u7i8o9p0AA==",
    kdf: { name: "PBKDF2", hash: "SHA-256", iterations: 120_000, extra: "se cae" },
    blob: "ENC1.AAAAAAAAAAAA.BBBBBBBBBB",
    campo_extra: "se cae",
  };
  const clean = cleanEnvelopeForUpload(raw);
  assert.deepEqual(Object.keys(clean).sort(), ["app", "blob", "kdf", "salt", "updatedAt", "v"]);
  assert.equal(clean.campo_extra, undefined);
  assert.equal(clean.kdf.extra, undefined);
  assert.equal(clean.v, 2);
});

test("cleanEnvelopeForUpload rechaza blobs enormes, versiones raras y KDF abusivo", () => {
  const base = {
    v: 2,
    salt: "q1w2e3r4t5y6u7i8o9p0AA==",
    kdf: { name: "PBKDF2", hash: "SHA-256", iterations: 120_000 },
    blob: "ENC1.A.B",
  };
  assert.equal(cleanEnvelopeForUpload(base).v, 2);
  assert.equal(cleanEnvelopeForUpload({ ...base, v: 1 }).v, 1, "v1 sigue aceptándose");
  assert.equal(cleanEnvelopeForUpload({ ...base, v: 3 }), null);
  assert.equal(cleanEnvelopeForUpload({ ...base, blob: "" }), null);
  assert.equal(cleanEnvelopeForUpload({ ...base, blob: "x".repeat(512 * 1024 + 1) }), null);
  assert.equal(cleanEnvelopeForUpload({ ...base, salt: "corta" }), null);
  assert.equal(
    cleanEnvelopeForUpload({ ...base, kdf: { iterations: 50_000_000 } }),
    null
  );
  assert.equal(cleanEnvelopeForUpload(null), null);
  assert.equal(cleanEnvelopeForUpload("texto"), null);
  assert.equal(cleanEnvelopeForUpload([base]), null);
});

test("la sal y los parámetros del sobre viajan en el propio respaldo", async () => {
  const env = await buildEnvelope(PASS);
  const clean = cleanEnvelopeForUpload(env);
  assert.equal(clean.salt, env.salt);
  assert.equal(clean.kdf.iterations, env.kdf.iterations);
  assert.equal(clean.blob, env.blob);
});
