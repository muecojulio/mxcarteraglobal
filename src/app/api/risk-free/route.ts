import { NextResponse } from "next/server";
import { publicFredCsv } from "@/lib/free-finance";

export const dynamic = "force-dynamic";

function lastPct(rows: Array<{ value: number | null }> | undefined) {
  if (!rows?.length) return null;
  for (let i = rows.length - 1; i >= 0; i--) {
    const n = rows[i]?.value;
    if (n != null && Number.isFinite(n)) return n;
  }
  return null;
}

export async function GET() {
  try {
    const [mx, us] = await Promise.all([
      publicFredCsv("INTGSTMXM193N"),
      publicFredCsv("DGS3MO"),
    ]);
    const mxAnnualPct = lastPct(mx?.rows ?? undefined);
    const us3mPct = lastPct(us?.rows ?? undefined);
    return NextResponse.json({
      mxAnnualPct,
      us3mPct,
      source: mxAnnualPct != null ? "FRED INTGSTMXM193N" : us3mPct != null ? "FRED DGS3MO" : "none",
      note: "Aprox. educativa. No es la tasa objetivo de Banxico.",
    });
  } catch {
    return NextResponse.json({ mxAnnualPct: null, source: "error" });
  }
}
