import { NextRequest, NextResponse } from "next/server";
import { resolveClientKey } from "./client-ip";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 45;

/**
 * Tope de clientes distintos que se siguen en memoria.
 *
 * Antes `buckets` crecía sin límite: una entrada por IP para siempre. Con un
 * proxy público eso es una fuga de memoria y un vector de DoS trivial (basta
 * mandar peticiones con `X-Forwarded-For` distintos). Aquí se purgan las
 * ventanas vencidas y, si aun así se pasa el tope, se descartan las más
 * antiguas. El costo es que bajo abuso masivo el límite se vuelve aproximado,
 * que es exactamente el caso donde importa menos.
 */
const MAX_TRACKED_CLIENTS = 5_000;

type Bucket = { start: number; count: number };
const buckets = new Map<string, Bucket>();

function clientKey(req: NextRequest): string {
  // Modelo de confianza en `client-ip.ts`: Vercel (su borde reescribe el
  // header), proxy propio declarado con TRUST_PROXY=1, o cubo compartido.
  return resolveClientKey({
    forwardedFor: req.headers.get("x-forwarded-for"),
    realIp: req.headers.get("x-real-ip"),
    onVercel: process.env.VERCEL === "1",
    trustProxyHop: process.env.TRUST_PROXY === "1",
    development: process.env.NODE_ENV !== "production",
  });
}

function sweep(now: number): void {
  if (buckets.size < MAX_TRACKED_CLIENTS) return;

  for (const [key, bucket] of buckets) {
    if (now - bucket.start > WINDOW_MS) buckets.delete(key);
  }
  if (buckets.size <= MAX_TRACKED_CLIENTS) return;

  const oldest = [...buckets.entries()].sort((a, b) => a[1].start - b[1].start);
  for (let i = 0; i < oldest.length - MAX_TRACKED_CLIENTS; i += 1) {
    buckets.delete(oldest[i]![0]);
  }
}

/**
 * Límite por cliente en memoria.
 *
 * Alcance real, sin adornos:
 * - En serverless el contador vive **por instancia**, así que el tope efectivo
 *   es hasta N × MAX_PER_WINDOW con N instancias. No es un límite distribuido
 *   (eso requeriría un almacén compartido tipo Upstash/Vercel KV, con su propia
 *   credencial y costo).
 * - Sin proxy de confianza, todos los clientes comparten un cubo y el límite es
 *   global (ver `client-ip.ts`).
 *
 * Sirve para frenar abuso casual y para que las cachés de `next: { revalidate }`
 * absorban la mayor parte del tráfico antes de llegar a las fuentes de datos.
 */
export function rateLimit(req: NextRequest): NextResponse | null {
  const key = clientKey(req);
  const now = Date.now();
  sweep(now);

  const b = buckets.get(key);
  if (!b || now - b.start > WINDOW_MS) {
    buckets.set(key, { start: now, count: 1 });
    return null;
  }
  b.count += 1;
  if (b.count > MAX_PER_WINDOW) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Espera un minuto." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(WINDOW_MS / 1000)) },
      }
    );
  }
  return null;
}

/** Bloquea usos típicos desde otros sitios (ahorro de cuota en uso personal). */
export function rejectForeignOrigin(req: NextRequest): NextResponse | null {
  const site = req.headers.get("sec-fetch-site");
  if (site === "cross-site") {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  }

  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host) {
    try {
      const o = new URL(origin);
      if (o.host !== host) {
        return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
    }
  }
  return null;
}

export function guardApi(req: NextRequest): NextResponse | null {
  return rejectForeignOrigin(req) || rateLimit(req);
}
