import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCsp, makeNonce } from "../src/lib/csp.ts";
import {
  PIN_MIN_LENGTH,
  checkVerifier,
  createVerifier,
  isLegacyVerifier,
} from "../src/lib/app-lock.ts";

/* ------------------------------- CSP ------------------------------------- */

test("CSP de producción: nonce + strict-dynamic y sin 'unsafe-inline'", () => {
  const csp = buildCsp({ nonce: "abc123", development: false });
  const scriptSrc = csp
    .split("; ")
    .find((part) => part.startsWith("script-src")) ?? "";
  assert.match(scriptSrc, /'nonce-abc123'/);
  assert.match(scriptSrc, /'strict-dynamic'/);
  assert.doesNotMatch(scriptSrc, /unsafe-inline/);
  assert.doesNotMatch(scriptSrc, /unsafe-eval/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /connect-src 'self'/);
  assert.doesNotMatch(csp, /wss:/, "el WS con la llave del proveedor ya no existe");
});

test("CSP de desarrollo: permisiva para HMR y sin nonce (el nonce anula unsafe-inline)", () => {
  const csp = buildCsp({ nonce: "abc123", development: true });
  const scriptSrc = csp
    .split("; ")
    .find((part) => part.startsWith("script-src")) ?? "";
  assert.match(scriptSrc, /unsafe-inline/);
  assert.match(scriptSrc, /unsafe-eval/);
  assert.doesNotMatch(scriptSrc, /nonce-/, "con nonce, 'unsafe-inline' se ignora");
  assert.match(csp, /frame-ancestors 'self' https:\/\/\*\.arena\.ai/);
});

test("makeNonce: distinto en cada petición y en base64", () => {
  const nonces = new Set(Array.from({ length: 50 }, () => makeNonce()));
  assert.equal(nonces.size, 50, "no debe repetirse");
  for (const n of nonces) {
    assert.match(n, /^[A-Za-z0-9+/]+=*$/);
    assert.ok(n.length >= 16);
  }
});

/* --------------------------- verificadores -------------------------------- */

async function legacyHash(secret) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

test("verificador nuevo: acepta la clave correcta y rechaza la incorrecta", async () => {
  const stored = await createVerifier("mxcg:123456");
  assert.match(stored, /^pbkdf2\$210000\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
  assert.equal(isLegacyVerifier(stored), false);

  const ok = await checkVerifier(stored, "mxcg:123456");
  assert.deepEqual(ok, { ok: true, legacy: false });
  const bad = await checkVerifier(stored, "mxcg:123457");
  assert.equal(bad.ok, false);
});

test("la misma clave produce verificadores distintos (salt aleatoria)", async () => {
  const a = await createVerifier("mxcg:abcdef");
  const b = await createVerifier("mxcg:abcdef");
  assert.notEqual(a, b);
  assert.equal((await checkVerifier(a, "mxcg:abcdef")).ok, true);
  assert.equal((await checkVerifier(b, "mxcg:abcdef")).ok, true);
});

test("verificador antiguo (SHA-256 sin salt) se acepta y se marca como legacy", async () => {
  const stored = await legacyHash("mxcg:1234");
  assert.equal(isLegacyVerifier(stored), true);
  const res = await checkVerifier(stored, "mxcg:1234");
  assert.deepEqual(res, { ok: true, legacy: true });
  assert.equal((await checkVerifier(stored, "mxcg:1235")).ok, false);
});

test("verificadores corruptos o con parámetros abusivos no cuelgan ni aceptan", async () => {
  for (const bad of [
    "",
    "pbkdf2$120000$", // incompleto
    "pbkdf2$1000$AAAA$AAAA", // iteraciones demasiado bajas
    "pbkdf2$9999999$AAAA$AAAA", // demasiado altas
    "otro$210000$AAAA$AAAA",
    "pbkdf2$abc$AAAA$AAAA",
    "no-es-un-verificador",
  ]) {
    assert.equal(isLegacyVerifier(bad), false);
    const res = await checkVerifier(bad, "mxcg:123456");
    assert.equal(res.ok, false, `no debe aceptar: ${bad}`);
  }
});

test("el mínimo de clave es 6 (antes 4)", () => {
  assert.equal(PIN_MIN_LENGTH, 6);
});
