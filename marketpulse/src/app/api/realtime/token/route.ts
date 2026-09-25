import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Entrega el token Finnhub solo si existe en el servidor. Sin key → 404 (el cliente pone status off). */
export async function GET() {
  const token = process.env.FINNHUB_API_KEY?.trim();
  if (!token) {
    return NextResponse.json({ error: "FINNHUB_API_KEY no configurada" }, { status: 404 });
  }
  return NextResponse.json({ token, provider: "finnhub" });
}
