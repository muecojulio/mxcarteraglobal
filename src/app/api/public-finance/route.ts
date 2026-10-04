import { NextRequest, NextResponse } from "next/server";
import { publicFredCsv, publicTreasuryDebt, publicTradingViewScan } from "@/lib/free-finance";
import { sanitizeSymbol, sanitizeSymbolList } from "@/lib/sanitize";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const series = sanitizeSymbol(req.nextUrl.searchParams.get("series")) || "DGS10";
  const symbols = sanitizeSymbolList(req.nextUrl.searchParams.get("symbols"), 50);
  const [fred, treasury, tradingview] = await Promise.all([
    publicFredCsv(series),
    publicTreasuryDebt(),
    symbols.length ? publicTradingViewScan(symbols) : Promise.resolve([]),
  ]);
  return NextResponse.json(
    {
      fred,
      treasury,
      tradingview,
      sources: {
        fred: "FRED public CSV",
        treasury: "U.S. Treasury Fiscal Data",
        tradingview: "TradingView Scanner público (no oficial)",
      },
      requiresApiKey: false,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    }
  );
}
