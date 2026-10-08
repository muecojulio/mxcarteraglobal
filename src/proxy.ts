import { NextRequest, NextResponse } from "next/server";
import { guardApi } from "@/lib/api-guard";
import { buildCsp, makeNonce } from "@/lib/csp";

/**
 * Proxy (antes `middleware` en Next 16).
 *
 * Dos responsabilidades:
 * 1. `/api/*`: rechaza orígenes ajenos y aplica el límite de peticiones.
 * 2. Páginas: fija la CSP. En producción va con un **nonce por petición** —
 *    se envía en la cabecera de la petición (para que Next lo aplique a sus
 *    scripts) y en la de la respuesta (para que el navegador la exija). El
 *    script de tema de `layout.tsx` lee ese nonce de `headers()`.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isDev = process.env.NODE_ENV === "development";

  if (pathname.startsWith("/api/")) {
    const blocked = guardApi(req);
    return blocked ?? NextResponse.next();
  }

  const nonce = makeNonce();
  const csp = buildCsp({ nonce, development: isDev });

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("Content-Security-Policy", csp);
  if (!isDev) requestHeaders.set("x-nonce", nonce);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  matcher: [
    // Rutas de API aparte: no necesitan CSP, sí el guardián.
    "/api/:path*",
    // Páginas y documentos (se excluyen los estáticos de Next y el favicon).
    "/((?!api/|_next/static|_next/image|favicon.ico).*)",
  ],
};
