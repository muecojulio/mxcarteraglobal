import { NextRequest, NextResponse } from "next/server";
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/api/")) return NextResponse.next();
  const origin = req.headers.get("origin");
  const host = req.headers.get("host") || "";
  if (origin) {
    try {
      const o = new URL(origin);
      const okHost = o.host === host || o.hostname === "localhost" || host.startsWith("localhost");
      if (!okHost) return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
    } catch {
      return NextResponse.json({ error: "Origen inválido" }, { status: 403 });
    }
  }
  return NextResponse.next();
}
export const config = { matcher: "/api/:path*" };
