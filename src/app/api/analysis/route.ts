import { NextRequest, NextResponse } from "next/server";
export async function GET(req: NextRequest) {
  const symbol = (req.nextUrl.searchParams.get("symbol") || "AAPL").toUpperCase();
  return NextResponse.json({
    symbol, name: symbol, region: symbol.endsWith(".MX") ? "MX" : "US",
    analysis: {
      summary: "Lectura automática con datos públicos limitados.",
      sections: [{ title: "Contexto", points: ["No es recomendación de inversión.", "Confirma en tu casa de bolsa."] }],
      disclaimer: "MX Cartera Global no es casa de bolsa ni asesor financiero.",
    },
  });
}
