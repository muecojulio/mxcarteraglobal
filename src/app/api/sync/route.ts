import { NextRequest, NextResponse } from "next/server";
import { withCachePolicy } from "@/lib/http-cache";

/**
 * Proxy de blob cifrado. El servidor NO tiene la llave;
 * solo guarda un JSON opaco en jsonblob.com (gratis).
 */

const BASE = "https://jsonblob.com/api/jsonBlob";

export const dynamic = "force-dynamic";

async function get(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (!id || !/^[A-Za-z0-9-]+$/.test(id)) {
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

async function post(req: NextRequest) {
  try {
    const body = await req.json();
    const envelope = body?.envelope;
    if (!envelope || envelope.v !== 1 || typeof envelope.blob !== "string") {
      return NextResponse.json({ error: "Sobre inválido" }, { status: 400 });
    }
    const existing = typeof body.id === "string" ? body.id.trim() : "";

    if (existing && /^[A-Za-z0-9-]+$/.test(existing)) {
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
