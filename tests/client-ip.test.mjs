import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clientKeyFromForwardedFor,
  clientKeyFromRealIp,
} from "../src/lib/client-ip.ts";

test("usa el último salto de X-Forwarded-For, no el que manda el cliente", () => {
  // El cliente pidió con -H "X-Forwarded-For: 9.9.9.9"; el proxy añadió la real al final.
  assert.equal(clientKeyFromForwardedFor("9.9.9.9, 203.0.113.7"), "203.0.113.7");
  assert.equal(clientKeyFromForwardedFor("203.0.113.7"), "203.0.113.7");
  // Cabeceras repetidas: `Headers.get` las une con ", " y el último valor es el del proxy.
  assert.equal(
    clientKeyFromForwardedFor("1.2.3.4, 5.6.7.8, 198.51.100.9"),
    "198.51.100.9"
  );
});

test("XFF fijo del atacante ya no crea un cliente nuevo por petición", () => {
  // Antes: cada valor falso era una clave distinta => bypass total del límite.
  const forged = "9.9.9.9";
  const withProxy = `${forged}, 203.0.113.7`;
  assert.equal(clientKeyFromForwardedFor(withProxy), "203.0.113.7");
  assert.equal(clientKeyFromForwardedFor(`${"8.8.8.8"}, 203.0.113.7`), "203.0.113.7");
});

test("acepta IPv6", () => {
  assert.equal(clientKeyFromForwardedFor("2001:db8::1, 2606:4700::1111"), "2606:4700::1111");
});

test("rechaza valores que no son IP (no se convierten en clave del Map)", () => {
  assert.equal(clientKeyFromForwardedFor(null), null);
  assert.equal(clientKeyFromForwardedFor(""), null);
  assert.equal(clientKeyFromForwardedFor("   ,  ,  "), null);
  assert.equal(clientKeyFromForwardedFor("a".repeat(5000)), null);
  assert.equal(clientKeyFromForwardedFor("no-es-una-ip"), null);
  assert.equal(clientKeyFromForwardedFor("<script>alert(1)</script>"), null);
});

test("x-real-ip es respaldo y también se valida", () => {
  assert.equal(clientKeyFromRealIp("203.0.113.7"), "203.0.113.7");
  assert.equal(clientKeyFromRealIp(" 2001:db8::1 "), "2001:db8::1");
  assert.equal(clientKeyFromRealIp("local"), null);
  assert.equal(clientKeyFromRealIp("<img src=x>"), null);
  assert.equal(clientKeyFromRealIp(undefined), null);
});
