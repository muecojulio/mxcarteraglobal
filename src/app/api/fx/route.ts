import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ usdMxn: 17.5, mxnUsd: 1 / 17.5, source: "fallback", asOf: new Date().toISOString() });
}
