import { NextResponse } from "next/server";
import { withCachePolicy } from "@/lib/http-cache";

export const dynamic = "force-dynamic";

/**
 * Entrega token Finnhub solo para el cliente de esta app (uso personal).
 * El WS de Finnhub requiere el token en el navegador.
 */
async function get() {
  const token = process.env.FINNHUB_API_KEY?.trim();
  if (!token) {
    return NextResponse.json(
      { error: "FINNHUB_API_KEY no configurada" },
      { status: 503 }
    );
  }
  return NextResponse.json({
    token,
    provider: "finnhub",
    note: "WebSocket trades US. Uso personal; no compartas la key.",
  });
}

export const GET = withCachePolicy("/api/realtime/token", get);
