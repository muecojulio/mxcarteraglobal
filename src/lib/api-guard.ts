import { NextRequest, NextResponse } from "next/server";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 45;
const MAX_BUCKETS = 2_000;
type Bucket = { start: number; count: number };
const buckets = new Map<string, Bucket>();

function clientKey(req: NextRequest): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "forwarded";
  return req.headers.get("x-real-ip") || "local";
}

function pruneBuckets(now: number) {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (now - bucket.start > WINDOW_MS) buckets.delete(key);
  }
  while (buckets.size > MAX_BUCKETS) {
    const oldest = buckets.keys().next().value as string | undefined;
    if (!oldest) break;
    buckets.delete(oldest);
  }
}

export function rateLimit(req: NextRequest): NextResponse | null {
  const key = clientKey(req);
  const now = Date.now();
  pruneBuckets(now);
  const b = buckets.get(key);
  if (!b || now - b.start > WINDOW_MS) {
    buckets.set(key, { start: now, count: 1 });
    return null;
  }
  b.count += 1;
  if (b.count > MAX_PER_WINDOW) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Espera un minuto." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((WINDOW_MS - (now - b.start)) / 1000)) } }
    );
  }
  return null;
}

export function rejectForeignOrigin(req: NextRequest): NextResponse | null {
  const site = req.headers.get("sec-fetch-site");
  if (site === "cross-site") return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
    } catch {
      return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
    }
  }
  return null;
}

export function guardApi(req: NextRequest): NextResponse | null {
  return rejectForeignOrigin(req) || rateLimit(req);
}
