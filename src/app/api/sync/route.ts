import { NextRequest, NextResponse } from "next/server";
import { withCachePolicy } from "@/lib/http-cache";
import {
  MAX_BODY_BYTES,
  cleanEnvelopeForUpload,
} from "@/lib/sync-envelope";

/**
 * Proxy de blob cifrado. El servidor NO tiene la llave;
 * solo guarda un JSON opaco en jsonblob.com (gratis).
 *
 * Esta ruta es pública por diseño (no hay cuentas), así que lo que sí se
 * acota aquí es *cuánto* y *con qué forma* se puede subir:
 * - Cuerpo máximo de 512 KB: antes no había tope, así que cualquiera podía
 *   usar la ruta como almacenamiento ajeno o inflar la memoria de la función.
 * - El sobre se reconstruye campo por campo con lo validado; no se reenvía el
 *   JSON del cliente tal cual.
 */

const BASE = "https://jsonblob.com/api/jsonBlob";

export const dynamic = "force-dynamic";

class BodyTooLarge extends Error {}

/** Lee el cuerpo como JSON sin aceptar más de `maxBytes` (Content-Length miente o falta). */
async function readJsonCapped(req: NextRequest, maxBytes: number): Promise<unknown> {
  const declared = Number(req.headers.get("content-length") || "");
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new BodyTooLarge();
  }
  if (!req.body) return null;

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new BodyTooLarge();
    }
    chunks.push(value);
  }

  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(joined)) as unknown;
}

async function get(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (!id || !/^[A-Za-z0-9-]{1,64}$/.test(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  try {
    const res = await fetch(`${BASE}/${id}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "No se encontró el respaldo en la nube" },
        { status: 404 }
      );
    }
    const envelope = await res.json();
    return NextResponse.json({ id, envelope });
  } catch {
    return NextResponse.json({ error: "Error de red (nube)" }, { status: 502 });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

async function post(req: NextRequest) {
  let body: unknown;
  try {
    body = await readJsonCapped(req, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof BodyTooLarge) {
      return NextResponse.json(
        { error: "El respaldo es demasiado grande (máx. 512 KB)" },
        { status: 413 }
      );
    }
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const envelope = cleanEnvelopeForUpload(isRecord(body) ? body.envelope : null);
  if (!envelope) {
    return NextResponse.json({ error: "Sobre inválido" }, { status: 400 });
  }
  const existing = isRecord(body) && typeof body.id === "string" ? body.id.trim() : "";

  try {
    if (existing && /^[A-Za-z0-9-]{1,64}$/.test(existing)) {
      const res = await fetch(`${BASE}/${existing}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(envelope),
      });
      if (res.ok) {
        return NextResponse.json({ id: existing, updated: true });
      }
    }

    const res = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(envelope),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "El servicio de nube no respondió" },
        { status: 502 }
      );
    }
    const loc = res.headers.get("location") || res.headers.get("Location") || "";
    const id = loc.split("/").pop() || "";
    if (!id) {
      return NextResponse.json({ error: "Sin ID de nube" }, { status: 502 });
    }
    return NextResponse.json({ id, created: true });
  } catch {
    return NextResponse.json({ error: "Error al subir" }, { status: 500 });
  }
}

export const GET = withCachePolicy("/api/sync", get);
export const POST = withCachePolicy("/api/sync", post);
