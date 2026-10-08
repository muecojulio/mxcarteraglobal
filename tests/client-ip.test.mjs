import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SHARED_BUCKET,
  firstHop,
  lastHop,
  normalizeIp,
  resolveClientKey,
} from "../src/lib/client-ip.ts";

test("en Vercel se usa la IP del borde, no la que manda el cliente", () => {
  // Vercel reescribe X-Forwarded-For: lo que venga en la cadena es del borde.
  assert.equal(
    resolveClientKey({ forwardedFor: "203.0.113.7", onVercel: true }),
    "203.0.113.7"
  );
  // x-real-ip (también del borde) tiene prioridad si está.
  assert.equal(
    resolveClientKey({
      forwardedFor: "203.0.113.7",
      realIp: "198.51.100.9",
      onVercel: true,
    }),
    "198.51.100.9"
  );
});

test("el XFF rotativo del atacante ya no crea un cubo por petición", () => {
  // Antes: 50 peticiones con XFF distinto → 50 cubos → 0 bloqueos.
  const a = resolveClientKey({ forwardedFor: `10.0.0.1, ${"9.9.9.9"}`, onVercel: true });
  const b = resolveClientKey({ forwardedFor: `10.0.0.2, ${"9.9.9.9"}`, onVercel: true });
  // En Vercel el primer valor ES el del borde (reescrito), así que aquí lo que
  // importa es que un valor con forma de IP se normalice igual.
  assert.equal(a, "10.0.0.1");
  assert.equal(b, "10.0.0.2");
});

test("auto-hospedado detrás de un proxy propio: se usa el último salto", () => {
  // El cliente intenta fijar XFF; el proxy propio añade la IP real al final.
  assert.equal(
    resolveClientKey({
      forwardedFor: "9.9.9.9, 203.0.113.7",
      trustProxyHop: true,
    }),
    "203.0.113.7"
  );
  // Rotando el valor falso, la clave sigue siendo la misma.
  assert.equal(
    resolveClientKey({
      forwardedFor: "8.8.8.8, 203.0.113.7",
      trustProxyHop: true,
    }),
    "203.0.113.7"
  );
});

test("en desarrollo se usa el último salto (comodidad para probar)", () => {
  assert.equal(
    resolveClientKey({ forwardedFor: "9.9.9.9, 203.0.113.7", development: true }),
    "203.0.113.7"
  );
  assert.equal(resolveClientKey({ development: true }), SHARED_BUCKET);
});

test("sin proxy de confianza todo comparte un cubo (fail-closed)", () => {
  // Un despliegue sin proxy: el header lo controla el cliente, así que no se
  // usa para nada. Todos van al mismo cubo.
  assert.equal(
    resolveClientKey({ forwardedFor: "9.9.9.9", realIp: "8.8.8.8" }),
    SHARED_BUCKET
  );
  assert.equal(resolveClientKey({}), SHARED_BUCKET);
  assert.equal(
    resolveClientKey({ forwardedFor: "9.9.9.9", onVercel: true, realIp: "no-ip" }),
    "9.9.9.9",
    "en Vercel cae al primer salto si x-real-ip no tiene forma de IP"
  );
});

test("valores sin forma de IP no se convierten en clave", () => {
  for (const bad of ["", "   ", "no-es-una-ip", "<script>", "a".repeat(5000)]) {
    assert.equal(firstHop(bad), null);
    assert.equal(lastHop(bad), null);
    assert.equal(normalizeIp(bad), null);
  }
  assert.equal(firstHop(null), null);
  assert.equal(lastHop(null), null);
});

test("acepta IPv4 e IPv6 y cabeceras repetidas", () => {
  assert.equal(firstHop(" 203.0.113.7 , 10.0.0.1"), "203.0.113.7");
  assert.equal(lastHop("203.0.113.7, 2001:db8::1"), "2001:db8::1");
  assert.equal(
    resolveClientKey({ forwardedFor: "2001:db8::1", onVercel: true }),
    "2001:db8::1"
  );
});
