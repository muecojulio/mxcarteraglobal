import { NextRequest, NextResponse } from "next/server";
import { getMarketDataProvider, getDataSources } from "@/lib/market-data";
import { withCachePolicy } from "@/lib/http-cache";

export const dynamic = "force-dynamic";

const US_LEADERS = [
  "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "JPM", "V", "UNH",
];
const MX_LEADERS = [
  "AMXL.MX", "WALMEX.MX", "GFNORTEO.MX", "FEMSAUBD.MX", "BIMBOA.MX",
  "CEMEXCPO.MX", "GMEXICOB.MX", "TLEVISACPO.MX",
];
const EU_LEADERS = ["SAP.DE", "ASML.AS", "MC.PA", "OR.PA", "SIE.DE"];
const ASIA_LEADERS = ["7203.T", "6758.T", "0700.HK", "9988.HK", "005930.KS"];

async function get(req: NextRequest) {
  const region = (req.nextUrl.searchParams.get("region") || "US").toUpperCase();
  const provider = getMarketDataProvider();

  try {
    const indices = (await provider.getIndices?.()) ?? [];

    let symbols: string[] = US_LEADERS;
    if (region === "MX") symbols = MX_LEADERS;
    else if (region === "EU") symbols = EU_LEADERS;
    else if (region === "ASIA") symbols = ASIA_LEADERS;
    else if (region === "ALL") {
      symbols = [...US_LEADERS.slice(0, 5), ...MX_LEADERS.slice(0, 4), ...EU_LEADERS.slice(0, 3)];
    }

    const quotes = await provider.getQuotes(symbols);

    // Top BMV if Mexico
    let movers: {
      gainers: Array<{ symbol: string; price: number; changePercent: number }>;
      losers: Array<{ symbol: string; price: number; changePercent: number }>;
    } | null = null;

    if (region === "MX" || region === "ALL") {
      const token = process.env.DATABURSATIL_TOKEN?.trim();
      if (token) {
        const today = new Date().toISOString().slice(0, 10);
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        try {
          const url = `https://api.databursatil.com/v2/top?token=${token}&variables=suben,bajan&bolsa=BMV&cantidad=8&mercado=local&inicio=${yesterday}&final=${today}`;
          const res = await fetch(url, { next: { revalidate: 300 } });
          if (res.ok) {
            const data = await res.json();
            const gainers = (data.SUBEN || []).map(
              (r: { e: string; u: number; c: number }) => ({
                symbol: r.e,
                price: r.u,
                changePercent: r.c,
              })
            );
            const losers = (data.BAJAN || []).map(
              (r: { e: string; u: number; c: number }) => ({
                symbol: r.e,
                price: r.u,
                changePercent: r.c,
              })
            );
            movers = { gainers, losers };
          }
        } catch {
          /* ignore */
        }
      }
    }

    return NextResponse.json({
      region,
      indices,
      quotes,
      movers,
      sources: getDataSources(),
    });
  } catch (err) {
    console.error("Markets API error:", err);
    return NextResponse.json(
      { error: "Error al cargar mercados", indices: [], quotes: [] },
      { status: 500 }
    );
  }
}

export const GET = withCachePolicy("/api/markets", get);
