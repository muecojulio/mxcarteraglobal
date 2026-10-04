import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

/**
 * No expone FINNHUB_API_KEY: esa clave queda reservada para consultas servidor-servidor.
 * Para realtime en navegador, configura un token separado y deliberadamente público.
 */
export async function GET() {
  const token = process.env.FINNHUB_REALTIME_PUBLIC_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(
      { error: "Realtime no configurado con token público" },
      { status: 404, headers: NO_STORE }
    );
  }
  return NextResponse.json({ token, provider: "finnhub" }, { headers: NO_STORE });
}
