import { NextRequest, NextResponse } from "next/server";
import { freeYahooHistory } from "@/lib/yahoo-history";

export const dynamic = "force-dynamic";

const RANGE: Record<string, string> = {
  "1s": "5d",
  "1m": "1mo",
  "3m": "6mo",
  "1a": "1y",
  "5a": "5y",
};

export async function GET(req: NextRequest) {
  const holdingsRaw = req.nextUrl.searchParams.get("holdings") || "";
  const rangeKey = req.nextUrl.searchParams.get("range") || "1s";
  const yahooRange = RANGE[rangeKey] || "1y";
  const parts = holdingsRaw.split(",").map((p) => p.trim()).filter(Boolean).slice(0, 20);
  const holdings = parts.map((p) => {
    const [symbol, qty] = p.split(":");
    return { symbol: (symbol || "").toUpperCase(), qty: Number(qty) || 0 };
  }).filter((h) => h.symbol && h.qty > 0);
  if (!holdings.length) return NextResponse.json({ points: [], periodChange: null, periodChangePercent: null });
  try {
    const series = await Promise.all(holdings.map(async (h) => ({ ...h, candles: await freeYahooHistory(h.symbol, yahooRange) })));
    const times = new Set<number>();
    series.forEach((s) => s.candles.forEach((c) => times.add(c.t)));
    const sorted = [...times].sort((a, b) => a - b);
    const points = sorted.map((t) => {
      let value = 0;
      let ok = 0;
      series.forEach((s) => {
        const c = s.candles.find((x) => x.t === t) || s.candles.filter((x) => x.t <= t).at(-1);
        if (c) { value += c.c * s.qty; ok++; }
      });
      return { t, value: ok ? value : 0 };
    }).filter((p) => p.value > 0);
    const first = points[0]?.value ?? 0;
    const last = points.at(-1)?.value ?? 0;
    const periodChange = last - first;
    const periodChangePercent = first ? (periodChange / first) * 100 : null;
    return NextResponse.json({ points, periodChange, periodChangePercent });
  } catch {
    return NextResponse.json({ points: [], periodChange: null, periodChangePercent: null });
  }
}
