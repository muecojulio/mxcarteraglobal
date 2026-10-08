import { NextRequest, NextResponse } from "next/server";
import { sanitizeSymbol } from "@/lib/sanitize";
import { getMarketDataProvider, detectRegion } from "@/lib/market-data";
import { detectAssetType } from "@/lib/market-data/types";

export const dynamic = "force-dynamic";

type Candle = { t: number; o: number; h: number; l: number; c: number; v?: number };

function yahooRangeParams(rangeKey: string): { range: string; interval: string } {
  const map: Record<string, { range: string; interval: string }> = {
    "1d": { range: "1d", interval: "5m" },
    "1w": { range: "5d", interval: "30m" },
    "5d": { range: "5d", interval: "30m" },
    "1mo": { range: "1mo", interval: "1d" },
    "3mo": { range: "3mo", interval: "1d" },
    "6mo": { range: "6mo", interval: "1d" },
    ytd: { range: "ytd", interval: "1d" },
    "1y": { range: "1y", interval: "1d" },
    "5y": { range: "5y", interval: "1wk" },
    max: { range: "max", interval: "1mo" },
  };
  return map[rangeKey] || { range: "3mo", interval: "1d" };
}

/** Alias Yahoo cuando el ticker BMV no existe igual (ej. AMXL.MX → AMX ADR) */
const YAHOO_HISTORY_ALIASES: Record<string, string[]> = {
  "AMXL.MX": ["AMX", "AMX.MX"],
  "AMX.MX": ["AMX"],
  "TLEVISACPO.MX": ["TV", "TLEVISACPO.MX"],
  "GMEXICOB.MX": ["GMEXICOB.MX", "GMBXF"],
};

function yahooHistoryCandidates(symbol: string): string[] {
  const sym = symbol.trim().toUpperCase();
  const out: string[] = [];
  const add = (s: string) => {
    if (s && !out.includes(s)) out.push(s);
  };
  add(sym);
  (YAHOO_HISTORY_ALIASES[sym] || []).forEach(add);
  if (sym.endsWith(".MX")) {
    add(sym.replace(/\.MX$/, ""));
  }
  return out;
}

async function fetchYahooHistoryOnce(
  symbol: string,
  range: string,
  interval: string
): Promise<Candle[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=${interval}&range=${range}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; MX Cartera Global/1.0)" },
    next: { revalidate: 300 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  if (data?.chart?.error) return [];
  const result = data?.chart?.result?.[0];
  if (!result?.timestamp) return [];
  const ts: number[] = result.timestamp;
  const q = result.indicators?.quote?.[0] || {};
  const candles: Candle[] = [];
  for (let i = 0; i < ts.length; i++) {
    const c = q.close?.[i];
    if (c == null) continue;
    candles.push({
      t: ts[i],
      o: q.open?.[i] ?? c,
      h: q.high?.[i] ?? c,
      l: q.low?.[i] ?? c,
      c,
      v: q.volume?.[i],
    });
  }
  return candles;
}

async function fetchYahooHistory(symbol: string, rangeKey = "3mo"): Promise<Candle[]> {
  const { range, interval } = yahooRangeParams(rangeKey);
  for (const candidate of yahooHistoryCandidates(symbol)) {
    try {
      const candles = await fetchYahooHistoryOnce(candidate, range, interval);
      if (candles.length) return candles;
    } catch {
      /* siguiente */
    }
  }
  // Reintento con intervalo diario si el intradía falló
  if (interval !== "1d") {
    for (const candidate of yahooHistoryCandidates(symbol)) {
      try {
        const candles = await fetchYahooHistoryOnce(candidate, range === "1d" ? "5d" : range, "1d");
        if (candles.length) return candles;
      } catch {
        /* */
      }
    }
  }
  return [];
}


async function fetchYahooQuoteStats(symbol: string): Promise<{
  high52?: number | null;
  low52?: number | null;
  pe?: number | null;
  marketCap?: number | null;
  divYield?: number | null;
  avgVolume?: number | null;
  dayHigh?: number | null;
  dayLow?: number | null;
  volume?: number | null;
  expenseRatio?: number | null;
}> {
  const modules = "price,summaryDetail,defaultKeyStatistics,fundProfile";
  for (const candidate of yahooHistoryCandidates(symbol)) {
    try {
      const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
        candidate
      )}?modules=${modules}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MX Cartera Global/1.0)" },
        next: { revalidate: 600 },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const r = data?.quoteSummary?.result?.[0];
      if (!r) continue;
      const price = r.price || {};
      const sum = r.summaryDetail || {};
      const keys = r.defaultKeyStatistics || {};
      const raw = (o: { raw?: number } | number | null | undefined) => {
        if (o == null) return null;
        if (typeof o === "number") return o;
        return o.raw != null ? Number(o.raw) : null;
      };
      const high52 = raw(sum.fiftyTwoWeekHigh) ?? raw(keys.fiftyTwoWeekHigh);
      const low52 = raw(sum.fiftyTwoWeekLow) ?? raw(keys.fiftyTwoWeekLow);
      const pe = raw(sum.trailingPE) ?? raw(keys.trailingPE) ?? raw(sum.forwardPE);
      const marketCap = raw(price.marketCap) ?? raw(sum.marketCap);
      let divYield = raw(sum.dividendYield) ?? raw(sum.yield);
      // Yahoo a veces devuelve yield en fracción (0.03 = 3%)
      if (divYield != null && divYield > 0 && divYield < 1) divYield = divYield * 100;
      let expenseRatio =
        raw(keys.annualReportExpenseRatio) ??
        raw(keys.expenseRatio) ??
        null;
      try {
        const fees =
          r.fundProfile?.feesExpensesInvestment ||
          r.fundProfile?.feesExpenses ||
          {};
        const er =
          raw(fees.annualReportExpenseRatio) ??
          raw(fees.totalFees) ??
          raw(fees.expenseRatio);
        if (er != null && expenseRatio == null) expenseRatio = er;
      } catch {
        /* */
      }
      // Normalizar a porcentaje anual (ej. 0.03 o 0.0003 → 0.03%)
      if (expenseRatio != null && expenseRatio > 0) {
        if (expenseRatio < 0.01) expenseRatio = expenseRatio * 100;
        else if (expenseRatio < 0.5 && expenseRatio > 0.01) {
          // 0.03–0.49: podría ser ya % o fracción; valores típicos ETF 0.03–0.75%
          // si viene 0.03 asumir ya es %
        }
      }
      const avgVolume =
        raw(sum.averageVolume) ??
        raw(sum.averageDailyVolume10Day) ??
        raw(keys.averageVolume);
      const dayHigh = raw(price.regularMarketDayHigh) ?? raw(sum.dayHigh);
      const dayLow = raw(price.regularMarketDayLow) ?? raw(sum.dayLow);
      const volume = raw(price.regularMarketVolume) ?? raw(sum.volume);
      if (
        high52 != null ||
        low52 != null ||
        pe != null ||
        marketCap != null ||
        divYield != null ||
        avgVolume != null ||
        expenseRatio != null
      ) {
        return {
          high52,
          low52,
          pe,
          marketCap,
          divYield,
          avgVolume: avgVolume != null ? avgVolume / 1e6 : null,
          dayHigh,
          dayLow,
          volume,
          expenseRatio,
        };
      }
    } catch {
      /* siguiente */
    }
  }
  return {};
}

export async function GET(req: NextRequest) {
  const symbol = sanitizeSymbol(req.nextUrl.searchParams.get("symbol"));
  const range = req.nextUrl.searchParams.get("range") || "3mo";
  if (!symbol) {
    return NextResponse.json({ error: "symbol requerido" }, { status: 400 });
  }

  const provider = getMarketDataProvider();
  const region = detectRegion(symbol);
  const assetType = detectAssetType(symbol);
  const finnhub = process.env.FINNHUB_API_KEY?.trim();
  const fmp = process.env.FMP_API_KEY?.trim();
  const sym = symbol.toUpperCase();

  try {
    const [quote, history] = await Promise.all([
      provider.getQuote(sym),
      fetchYahooHistory(sym, range),
    ]);

    if (!quote && history.length === 0) {
      return NextResponse.json(
        { error: "Activo no encontrado", symbol: sym },
        { status: 404 }
      );
    }

    let profile: Record<string, unknown> | null = null;
    let metrics: Record<string, number | null> = {};
    let income: Array<{
      year: string;
      revenue: number;
      netIncome: number;
      margin: number;
    }> = [];
    let recommendation: {
      strongBuy: number;
      buy: number;
      hold: number;
      sell: number;
      strongSell: number;
      period?: string;
    } | null = null;
    let earnings: Array<{
      period: string;
      estimate: number | null;
      actual: number | null;
      surprisePercent: number | null;
      year?: number;
      quarter?: number;
    }> = [];
    let dividends: Array<{ date: string; amount: number }> = [];
    let priceTarget: {
      consensus: number | null;
      median: number | null;
      high: number | null;
      low: number | null;
      lastMonthAvg: number | null;
      lastMonthCount: number | null;
      lastQuarterAvg: number | null;
      lastQuarterCount: number | null;
    } | null = null;

    // Finnhub profile + metrics + recommendation + earnings (US best)
    if (finnhub) {
      const tasks: Promise<void>[] = [];

      tasks.push(
        (async () => {
          try {
            const res = await fetch(
              `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(
                sym
              )}&token=${finnhub}`,
              { next: { revalidate: 86400 } }
            );
            if (res.ok) profile = await res.json();
          } catch {
            /* */
          }
        })()
      );

      tasks.push(
        (async () => {
          try {
            const res = await fetch(
              `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(
                sym
              )}&metric=all&token=${finnhub}`,
              { next: { revalidate: 3600 } }
            );
            if (res.ok) {
              const data = await res.json();
              const m = data.metric || {};
              metrics = {
                pe: m.peBasicExclExtraTTM ?? m.peNormalizedAnnual ?? null,
                marketCap: m.marketCapitalization ?? null,
                high52: m["52WeekHigh"] ?? null,
                low52: m["52WeekLow"] ?? null,
                divYield: m.dividendYieldIndicatedAnnual ?? m.currentDividendYieldTTM ?? null,
                netMargin: m.netProfitMarginAnnual ?? m.netProfitMarginTTM ?? null,
                grossMargin: m.grossMarginAnnual ?? m.grossMarginTTM ?? null,
                roe: m.roeTTM ?? null,
                debtEquity: m["totalDebt/totalEquityAnnual"] ?? null,
                epsGrowth1Y: m.epsGrowthTTMYoy ?? null,
                epsGrowth3Y: m.epsGrowth3Y ?? null,
                epsGrowth5Y: m.epsGrowth5Y ?? null,
                revGrowth1Y: m.revenueGrowthTTMYoy ?? null,
                revGrowth3Y: m.revenueGrowth3Y ?? null,
                revGrowth5Y: m.revenueGrowth5Y ?? null,
                avgVolume: m["3MonthAverageTradingVolume"] ?? m["10DayAverageTradingVolume"] ?? null,
              };
            }
          } catch {
            /* */
          }
        })()
      );

      if (region === "US") {
        tasks.push(
          (async () => {
            try {
              const res = await fetch(
                `https://finnhub.io/api/v1/stock/recommendation?symbol=${encodeURIComponent(
                  sym
                )}&token=${finnhub}`,
                { next: { revalidate: 3600 } }
              );
              if (res.ok) {
                const list = await res.json();
                if (Array.isArray(list) && list[0]) {
                  recommendation = {
                    strongBuy: list[0].strongBuy || 0,
                    buy: list[0].buy || 0,
                    hold: list[0].hold || 0,
                    sell: list[0].sell || 0,
                    strongSell: list[0].strongSell || 0,
                    period: list[0].period,
                  };
                }
              }
            } catch {
              /* */
            }
          })()
        );

        tasks.push(
          (async () => {
            try {
              const res = await fetch(
                `https://finnhub.io/api/v1/stock/earnings?symbol=${encodeURIComponent(
                  sym
                )}&limit=8&token=${finnhub}`,
                { next: { revalidate: 3600 } }
              );
              if (res.ok) {
                const list = await res.json();
                if (Array.isArray(list)) {
                  earnings = list.map(
                    (e: {
                      period: string;
                      estimate?: number;
                      actual?: number;
                      surprisePercent?: number;
                      year?: number;
                      quarter?: number;
                    }) => ({
                      period: e.period,
                      estimate: e.estimate ?? null,
                      actual: e.actual ?? null,
                      surprisePercent: e.surprisePercent ?? null,
                      year: e.year,
                      quarter: e.quarter,
                    })
                  );
                }
              }
            } catch {
              /* */
            }
          })()
        );
      }

      await Promise.all(tasks);
    }

    // FMP income statements + ratios TTM + dividends
    if (fmp && region === "US") {
      await Promise.all([
        (async () => {
          try {
            const [cRes, sRes] = await Promise.all([
              fetch(
                `https://financialmodelingprep.com/stable/price-target-consensus?symbol=${encodeURIComponent(
                  sym
                )}&apikey=${fmp}`,
                { next: { revalidate: 3600 } }
              ),
              fetch(
                `https://financialmodelingprep.com/stable/price-target-summary?symbol=${encodeURIComponent(
                  sym
                )}&apikey=${fmp}`,
                { next: { revalidate: 3600 } }
              ),
            ]);
            let consensus: number | null = null;
            let median: number | null = null;
            let high: number | null = null;
            let low: number | null = null;
            let lastMonthAvg: number | null = null;
            let lastMonthCount: number | null = null;
            let lastQuarterAvg: number | null = null;
            let lastQuarterCount: number | null = null;
            if (cRes.ok) {
              const list = await cRes.json();
              const row = Array.isArray(list) ? list[0] : list;
              if (row) {
                consensus =
                  row.targetConsensus != null
                    ? Number(row.targetConsensus)
                    : null;
                median =
                  row.targetMedian != null ? Number(row.targetMedian) : null;
                high =
                  row.targetHigh != null ? Number(row.targetHigh) : null;
                low = row.targetLow != null ? Number(row.targetLow) : null;
              }
            }
            if (sRes.ok) {
              const list = await sRes.json();
              const row = Array.isArray(list) ? list[0] : list;
              if (row) {
                lastMonthAvg =
                  row.lastMonthAvgPriceTarget != null
                    ? Number(row.lastMonthAvgPriceTarget)
                    : null;
                lastMonthCount =
                  row.lastMonthCount != null
                    ? Number(row.lastMonthCount)
                    : null;
                lastQuarterAvg =
                  row.lastQuarterAvgPriceTarget != null
                    ? Number(row.lastQuarterAvgPriceTarget)
                    : null;
                lastQuarterCount =
                  row.lastQuarterCount != null
                    ? Number(row.lastQuarterCount)
                    : null;
              }
            }
            if (
              consensus != null ||
              high != null ||
              lastMonthAvg != null ||
              lastQuarterAvg != null
            ) {
              priceTarget = {
                consensus,
                median,
                high,
                low,
                lastMonthAvg,
                lastMonthCount,
                lastQuarterAvg,
                lastQuarterCount,
              };
            }
          } catch {
            /* */
          }
        })(),
        (async () => {
          try {
            const res = await fetch(
              `https://financialmodelingprep.com/stable/income-statement?symbol=${encodeURIComponent(
                sym
              )}&apikey=${fmp}`,
              { next: { revalidate: 86400 } }
            );
            if (res.ok) {
              const list = await res.json();
              if (Array.isArray(list)) {
                income = list
                  .slice(0, 6)
                  .map(
                    (r: {
                      fiscalYear?: string;
                      date?: string;
                      revenue?: number;
                      netIncome?: number;
                    }) => {
                      const revenue = Number(r.revenue) || 0;
                      const netIncome = Number(r.netIncome) || 0;
                      return {
                        year: String(r.fiscalYear || (r.date || "").slice(0, 4)),
                        revenue,
                        netIncome,
                        margin: revenue ? (netIncome / revenue) * 100 : 0,
                      };
                    }
                  )
                  .reverse();
              }
            }
          } catch {
            /* */
          }
        })(),
        (async () => {
          try {
            const res = await fetch(
              `https://financialmodelingprep.com/stable/ratios-ttm?symbol=${encodeURIComponent(
                sym
              )}&apikey=${fmp}`,
              { next: { revalidate: 3600 } }
            );
            if (res.ok) {
              const list = await res.json();
              if (Array.isArray(list) && list[0]) {
                const r = list[0];
                if (metrics.pe == null && r.priceToEarningsRatioTTM != null)
                  metrics.pe = Number(r.priceToEarningsRatioTTM);
                if (metrics.netMargin == null && r.netProfitMarginTTM != null)
                  metrics.netMargin = Number(r.netProfitMarginTTM) * 100;
              }
            }
          } catch {
            /* */
          }
        })(),
      ]);
    }

    // Dividend history via composite
    try {
      const composite = provider as {
        getDividends?: (s: string) => Promise<
          Array<{ date: string; amount: number }>
        >;
      };
      if (typeof composite.getDividends === "function") {
        const divs = await composite.getDividends(sym);
        dividends = (divs || []).slice(0, 12).map((d) => ({
          date: d.date,
          amount: d.amount,
        }));
      }
    } catch {
      /* */
    }

    // Yahoo stats (acciones, ETFs, FIBRAs / .MX)
    try {
      const yahooStats = await fetchYahooQuoteStats(sym);
      if (yahooStats.high52 != null && metrics.high52 == null)
        metrics.high52 = yahooStats.high52;
      if (yahooStats.low52 != null && metrics.low52 == null)
        metrics.low52 = yahooStats.low52;
      if (yahooStats.pe != null && metrics.pe == null) metrics.pe = yahooStats.pe;
      if (yahooStats.marketCap != null && metrics.marketCap == null)
        metrics.marketCap = yahooStats.marketCap;
      if (yahooStats.divYield != null && metrics.divYield == null)
        metrics.divYield = yahooStats.divYield;
      if (yahooStats.avgVolume != null && metrics.avgVolume == null)
        metrics.avgVolume = yahooStats.avgVolume;
      if (yahooStats.expenseRatio != null && (metrics as { expenseRatio?: number | null }).expenseRatio == null)
        (metrics as { expenseRatio?: number | null }).expenseRatio = yahooStats.expenseRatio;
      if (quote) {
        if (quote.high == null && yahooStats.dayHigh != null)
          (quote as { high?: number }).high = yahooStats.dayHigh;
        if (quote.low == null && yahooStats.dayLow != null)
          (quote as { low?: number }).low = yahooStats.dayLow;
        if (quote.volume == null && yahooStats.volume != null)
          (quote as { volume?: number }).volume = yahooStats.volume;
      }
    } catch {
      /* */
    }

    // Expense ratio ETF (FMP) si Yahoo no lo trajo
    if (
      fmp &&
      assetType === "etf" &&
      (metrics as { expenseRatio?: number | null }).expenseRatio == null
    ) {
      try {
        const url = `https://financialmodelingprep.com/stable/etf/info?symbol=${encodeURIComponent(
          sym.replace(/\.MX$/, "")
        )}&apikey=${fmp}`;
        const res = await fetch(url, { next: { revalidate: 86400 } });
        if (res.ok) {
          const j = await res.json();
          const row = Array.isArray(j) ? j[0] : j;
          let er =
            row?.expenseRatio ??
            row?.expenseRatioPercent ??
            row?.annualReportExpenseRatio ??
            null;
          if (er != null) {
            er = Number(er);
            if (er > 0 && er < 0.01) er = er * 100;
            (metrics as { expenseRatio?: number | null }).expenseRatio = er;
          }
        }
      } catch {
        /* */
      }
    }

    const closes = history.map((h) => h.c);
    const highPeriod = closes.length ? Math.max(...closes) : quote?.high;
    const lowPeriod = closes.length ? Math.min(...closes) : quote?.low;
    const first = closes[0];
    const last = closes[closes.length - 1] ?? quote?.price;
    const periodChange =
      first && last ? ((last - first) / first) * 100 : undefined;

    // `profile` se asigna dentro de tareas async; TS no rastrea ese flujo,
    // así que se vuelca a una constante con el tipo declarado.
    const profileSafe = profile as Record<string, unknown> | null;

    return NextResponse.json({
      symbol: quote?.symbol || sym,
      quote,
      profile: profileSafe
        ? {
            name: profileSafe.name,
            exchange: profileSafe.exchange,
            industry: profileSafe.finnhubIndustry || profileSafe.industry,
            marketCap: profileSafe.marketCapitalization,
            logo: profileSafe.logo,
            weburl: profileSafe.weburl,
            country: profileSafe.country,
            currency: profileSafe.currency,
            ipo: profileSafe.ipo,
          }
        : null,
      history,
      stats: {
        high52: metrics.high52 ?? (history.length >= 5 ? Math.max(...history.map((h) => h.h || h.c)) : highPeriod),
        low52: metrics.low52 ?? (history.length >= 5 ? Math.min(...history.map((h) => h.l || h.c)) : lowPeriod),
        dayHigh:
          quote?.high ??
          metrics.dayHigh ??
          (history.length ? history[history.length - 1].h ?? null : null),
        dayLow:
          quote?.low ??
          metrics.dayLow ??
          (history.length ? history[history.length - 1].l ?? null : null),
        periodChange,
        bars: history.length,
        pe: metrics.pe,
        marketCap:
          metrics.marketCap ??
          (profileSafe?.marketCapitalization != null
            ? Number(profileSafe.marketCapitalization)
            : null),
        divYield: (() => {
          if (metrics.divYield != null) {
            const y = Number(metrics.divYield);
            return y > 0 && y < 1 ? y * 100 : y;
          }
          const px = quote?.price;
          if (px && dividends.length) {
            const annual =
              dividends.length >= 4
                ? dividends.slice(0, 4).reduce((s, d) => s + d.amount, 0)
                : dividends[0].amount * 4;
            return (annual / px) * 100;
          }
          return null;
        })(),
        expenseRatio: (metrics as { expenseRatio?: number | null }).expenseRatio ?? null,
        avgVolume:
          metrics.avgVolume ??
          (history.some((h) => h.v)
            ? history.filter((h) => h.v).reduce((s, h) => s + (h.v || 0), 0) /
              history.filter((h) => h.v).length /
              1e6
            : null),
      },
      growth: {
        eps1Y: metrics.epsGrowth1Y,
        eps3Y: metrics.epsGrowth3Y,
        eps5Y: metrics.epsGrowth5Y,
        rev1Y: metrics.revGrowth1Y,
        rev3Y: metrics.revGrowth3Y,
        rev5Y: metrics.revGrowth5Y,
      },
      finance: {
        netMargin: metrics.netMargin,
        grossMargin: metrics.grossMargin,
        roe: metrics.roe,
        debtEquity: metrics.debtEquity,
        income,
      },
      recommendation,
      priceTarget,
      earnings,
      dividends,
      range,
      region,
      assetType,
    });
  } catch (err) {
    console.error("Asset API error:", err);
    return NextResponse.json(
      { error: "Error al cargar ficha" },
      { status: 500 }
    );
  }
}
