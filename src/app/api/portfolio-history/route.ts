import { NextRequest, NextResponse } from "next/server";
import { withCachePolicy } from "@/lib/http-cache";

export const dynamic = "force-dynamic";

type Holding = { symbol: string; quantity: number; currency?: string };

const RANGE_MAP: Record<string, { interval: string; range: string }> = {
  "1d": { interval: "5m", range: "1d" },
  "1w": { interval: "30m", range: "5d" },
  "1s": { interval: "30m", range: "5d" },
  "1m": { interval: "1d", range: "1mo" },
  "3m": { interval: "1d", range: "3mo" },
  "6m": { interval: "1d", range: "6mo" },
  ytd: { interval: "1d", range: "ytd" },
  "1y": { interval: "1d", range: "1y" },
  "5y": { interval: "1wk", range: "5y" },
  max: { interval: "1mo", range: "max" },
};

async function fetchUsdMxn(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.frankfurter.dev/v1/latest?base=USD&symbols=MXN",
      { next: { revalidate: 3600 } }
    );
    if (res.ok) {
      const d = await res.json();
      if (d?.rates?.MXN) return Number(d.rates.MXN);
    }
  } catch {
    /* */
  }
  return 17;
}

async function yahooSeries(
  symbol: string,
  interval: string,
  range: string
): Promise<Array<{ t: number; c: number }>> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?interval=${interval}&range=${range}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MX Cartera Global/1.0)" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result?.timestamp) return [];
    const ts: number[] = result.timestamp;
    const closes: (number | null)[] =
      result.indicators?.quote?.[0]?.close || [];
    const out: Array<{ t: number; c: number }> = [];
    for (let i = 0; i < ts.length; i++) {
      const c = closes[i];
      if (c == null) continue;
      out.push({ t: ts[i], c });
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * GET /api/portfolio-history?holdings=AAPL:10,MSFT:5,FUNO11.MX:100&range=1m&display=MXN
 * holdings = symbol:quantity pairs
 */
async function get(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("holdings") || "";
  const rangeKey = (req.nextUrl.searchParams.get("range") || "1m").toLowerCase();
  const display = (req.nextUrl.searchParams.get("display") || "MXN").toUpperCase() as
    | "MXN"
    | "USD";

  const holdings: Holding[] = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const [symbol, qty] = p.split(":");
      return {
        symbol: (symbol || "").trim().toUpperCase(),
        quantity: Number(qty) || 0,
      };
    })
    .filter((h) => h.symbol && h.quantity > 0)
    .slice(0, 25);

  if (!holdings.length) {
    return NextResponse.json(
      { error: "holdings requeridos (ej. AAPL:10,AMXL.MX:100)" },
      { status: 400 }
    );
  }

  const cfg = RANGE_MAP[rangeKey] || RANGE_MAP["1m"];
  const usdMxn = await fetchUsdMxn();

  const seriesList = await Promise.all(
    holdings.map(async (h) => {
      const series = await yahooSeries(h.symbol, cfg.interval, cfg.range);
      const isMx =
        h.symbol.endsWith(".MX") || h.symbol.endsWith(".MXN");
      return { ...h, series, isMx };
    })
  );

  // Unión de timestamps
  const allTs = new Set<number>();
  for (const s of seriesList) {
    for (const p of s.series) allTs.add(p.t);
  }
  const timestamps = [...allTs].sort((a, b) => a - b);
  if (!timestamps.length) {
    return NextResponse.json({
      points: [],
      usdMxn,
      display,
      range: rangeKey,
      message: "Sin histórico disponible",
    });
  }

  // Para cada holding, mapa t -> precio (forward-fill)
  function valueAt(
    series: Array<{ t: number; c: number }>,
    t: number
  ): number | null {
    if (!series.length) return null;
    let last: number | null = null;
    for (const p of series) {
      if (p.t <= t) last = p.c;
      else break;
    }
    return last;
  }

  const points: Array<{ t: number; value: number }> = [];
  for (const t of timestamps) {
    let total = 0;
    let ok = 0;
    for (const h of seriesList) {
      const px = valueAt(h.series, t);
      if (px == null) continue;
      let v = px * h.quantity;
      if (display === "MXN" && !h.isMx) v *= usdMxn;
      if (display === "USD" && h.isMx) v /= usdMxn;
      total += v;
      ok++;
    }
    if (ok > 0) points.push({ t, value: total });
  }

  const first = points[0]?.value;
  const last = points[points.length - 1]?.value;
  const change =
    first != null && last != null ? last - first : null;
  const changePercent =
    first && change != null ? (change / first) * 100 : null;

  return NextResponse.json({
    points,
    usdMxn,
    display,
    range: rangeKey,
    startValue: first ?? null,
    endValue: last ?? null,
    periodChange: change,
    periodChangePercent: changePercent,
    holdings: holdings.length,
  });
}

export const GET = withCachePolicy("/api/portfolio-history", get);
