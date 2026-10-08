import { NextRequest, NextResponse } from "next/server";
import { sanitizeSymbol } from "@/lib/sanitize";
import { getMarketDataProvider, detectRegion } from "@/lib/market-data";
import { detectAssetType, isExcludedInstrument, normalizeYahooSymbol } from "@/lib/market-data/types";
import { freeYahooSummary, publicSecCompanyFacts } from "@/lib/free-finance";

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
  const sym = normalizeYahooSymbol(symbol);
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

/** Finnhub historial con API key solo si Yahoo no publicó velas. */
async function fetchFinnhubHistory(
  symbol: string,
  rangeKey: string,
  token: string
): Promise<Candle[]> {
  const interval = yahooRangeParams(rangeKey).interval;
  const resolution = interval === "5m" ? "5" : interval === "30m" ? "30" : interval === "1wk" ? "W" : interval === "1mo" ? "M" : "D";
  const dayCounts: Record<string, number> = {
    "1d": 2, "1w": 7, "5d": 7, "1mo": 32, "3mo": 95, "6mo": 185,
    "1y": 370, "5y": 1830, max: 3650,
  };
  const now = new Date();
  const to = Math.floor(now.getTime() / 1000);
  const fromDate = rangeKey === "ytd" ? new Date(Date.UTC(now.getUTCFullYear(), 0, 1)) : new Date(now.getTime() - (dayCounts[rangeKey] || 95) * 86_400_000);
  const from = Math.floor(fromDate.getTime() / 1000);
  try {
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${encodeURIComponent(token)}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    if (data?.s !== "ok" || !Array.isArray(data.t)) return [];
    return data.t.flatMap((timestamp: number, index: number) => {
      const close = Number(data.c?.[index]);
      if (!Number.isFinite(close)) return [];
      return [{
        t: Number(timestamp),
        o: Number(data.o?.[index]) || close,
        h: Number(data.h?.[index]) || close,
        l: Number(data.l?.[index]) || close,
        c: close,
        v: Number(data.v?.[index]) || undefined,
      }];
    });
  } catch {
    return [];
  }
}



export async function GET(req: NextRequest) {
  const symbol = sanitizeSymbol(req.nextUrl.searchParams.get("symbol"));
  const range = req.nextUrl.searchParams.get("range") || "3mo";
  if (!symbol) {
    return NextResponse.json({ error: "symbol requerido" }, { status: 400 });
  }
  if (isExcludedInstrument(symbol)) {
    return NextResponse.json(
      { error: "La ficha solo admite acciones, ETFs y otros valores bursátiles; Forex y cripto están excluidos." },
      { status: 400 }
    );
  }

  const provider = getMarketDataProvider();
  const sym = normalizeYahooSymbol(symbol);
  const region = detectRegion(sym);
  const assetType = detectAssetType(sym);
  const finnhub = process.env.FINNHUB_API_KEY?.trim();
  const fmp = process.env.FMP_API_KEY?.trim();

  try {
    const [quote, yahooHistory, yahooSummary, secFacts] = await Promise.all([
      provider.getQuote(sym),
      fetchYahooHistory(sym, range),
      freeYahooSummary(sym),
      region === "US" && assetType === "stock"
        ? publicSecCompanyFacts(sym)
        : Promise.resolve(null),
    ]);
    let history = yahooHistory;
    let historySource: string | null = history.length ? "yahoo-public" : null;
    if (!history.length && finnhub && region === "US") {
      history = await fetchFinnhubHistory(sym, range, finnhub);
      if (history.length) historySource = "finnhub-fallback";
    }

    if (!quote && history.length === 0 && yahooSummary.price == null && !secFacts) {
      return NextResponse.json(
        { error: "Activo no encontrado", symbol: sym },
        { status: 404 }
      );
    }

    let profile: Record<string, unknown> | null =
      yahooSummary.name || quote?.name
        ? {
            name: yahooSummary.name || quote?.name,
            exchange: yahooSummary.exchange || quote?.exchange || quote?.market,
            currency: yahooSummary.currency || quote?.currency,
          }
        : null;
    let metrics: Record<string, number | null> = {
      pe: yahooSummary.pe,
      peg: yahooSummary.peg,
      pb: yahooSummary.pb,
      ps: yahooSummary.ps,
      marketCap: yahooSummary.marketCap,
      high52: yahooSummary.high52,
      low52: yahooSummary.low52,
      divYield: yahooSummary.divYield,
      expenseRatio: yahooSummary.expenseRatio,
      avgVolume: yahooSummary.avgVolume != null ? yahooSummary.avgVolume / 1e6 : null,
      roe: yahooSummary.roe,
      roa: yahooSummary.roa,
      roi: yahooSummary.roi,
      revGrowth1Y: yahooSummary.revGrowth,
      epsGrowth1Y: yahooSummary.epsGrowth,
      debtEquity: yahooSummary.debtEquity,
      currentRatio: yahooSummary.currentRatio,
    };
    const secFinancials = secFacts?.financials || [];
    const secLatest = secFinancials[secFinancials.length - 1];
    const secPrevious = secFinancials[secFinancials.length - 2];
    if (secLatest) {
      if (metrics.roe == null && secLatest.netIncome != null && secLatest.equity) {
        metrics.roe = (secLatest.netIncome / secLatest.equity) * 100;
      }
      if (metrics.debtEquity == null && secLatest.liabilities != null && secLatest.equity) {
        metrics.debtEquity = secLatest.liabilities / secLatest.equity;
      }
      if (
        metrics.revGrowth1Y == null &&
        secLatest.revenue != null &&
        secPrevious?.revenue != null &&
        secPrevious.revenue !== 0
      ) {
        metrics.revGrowth1Y = ((secLatest.revenue - secPrevious.revenue) / Math.abs(secPrevious.revenue)) * 100;
      }
      if (
        metrics.netMargin == null &&
        secLatest.revenue != null &&
        secLatest.revenue !== 0 &&
        secLatest.netIncome != null
      ) {
        metrics.netMargin = (secLatest.netIncome / secLatest.revenue) * 100;
      }
    }
    let income: Array<{
      year: string;
      revenue: number;
      netIncome: number;
      margin: number;
    }> = secFinancials.flatMap((row) => {
      if (row.revenue == null || row.netIncome == null) return [];
      return [{
        year: String(row.year),
        revenue: row.revenue,
        netIncome: row.netIncome,
        margin: row.revenue ? (row.netIncome / row.revenue) * 100 : 0,
      }];
    });
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
            if (res.ok) {
              const fallbackProfile = await res.json();
              profile = { ...fallbackProfile, ...(profile || {}) };
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
              `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(
                sym
              )}&metric=all&token=${finnhub}`,
              { next: { revalidate: 3600 } }
            );
            if (res.ok) {
              const data = await res.json();
              const m = data.metric || {};
              metrics = {
                ...metrics,
                pe: metrics.pe ?? m.peBasicExclExtraTTM ?? m.peNormalizedAnnual ?? null,
                peg: metrics.peg ?? m.pegRatio ?? null,
                pb: metrics.pb ?? m.pbAnnual ?? m.pbQuarterly ?? null,
                ps: metrics.ps ?? m.psAnnual ?? m.psTTM ?? null,
                marketCap: metrics.marketCap ?? m.marketCapitalization ?? null,
                high52: metrics.high52 ?? m["52WeekHigh"] ?? null,
                low52: metrics.low52 ?? m["52WeekLow"] ?? null,
                divYield: metrics.divYield ?? m.dividendYieldIndicatedAnnual ?? m.currentDividendYieldTTM ?? null,
                netMargin: metrics.netMargin ?? m.netProfitMarginAnnual ?? m.netProfitMarginTTM ?? null,
                grossMargin: metrics.grossMargin ?? m.grossMarginAnnual ?? m.grossMarginTTM ?? null,
                roe: metrics.roe ?? m.roeTTM ?? null,
                roa: metrics.roa ?? m.roaTTM ?? null,
                roi: metrics.roi ?? m.roiTTM ?? null,
                debtEquity: metrics.debtEquity ?? m["totalDebt/totalEquityAnnual"] ?? null,
                currentRatio: metrics.currentRatio ?? m.currentRatioAnnual ?? m.currentRatioQuarterly ?? null,
                epsGrowth1Y: metrics.epsGrowth1Y ?? m.epsGrowthTTMYoy ?? null,
                epsGrowth3Y: metrics.epsGrowth3Y ?? m.epsGrowth3Y ?? null,
                epsGrowth5Y: metrics.epsGrowth5Y ?? m.epsGrowth5Y ?? null,
                revGrowth1Y: metrics.revGrowth1Y ?? m.revenueGrowthTTMYoy ?? null,
                revGrowth3Y: metrics.revGrowth3Y ?? m.revenueGrowth3Y ?? null,
                revGrowth5Y: metrics.revGrowth5Y ?? m.revenueGrowth5Y ?? null,
                avgVolume: metrics.avgVolume ?? m["3MonthAverageTradingVolume"] ?? m["10DayAverageTradingVolume"] ?? null,
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
              if (Array.isArray(list) && income.length === 0) {
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

    // Completa rangos intradía/volumen desde el resumen Yahoo ya consultado.
    metrics.dayHigh = yahooSummary.dayHigh;
    metrics.dayLow = yahooSummary.dayLow;
    if (quote) {
      if (quote.high == null && yahooSummary.dayHigh != null)
        quote.high = yahooSummary.dayHigh;
      if (quote.low == null && yahooSummary.dayLow != null)
        quote.low = yahooSummary.dayLow;
      if (quote.volume == null && yahooSummary.volume != null)
        quote.volume = yahooSummary.volume;
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
        peg: metrics.peg,
        pb: metrics.pb,
        ps: metrics.ps,
        roe: metrics.roe,
        roa: metrics.roa,
        roi: metrics.roi,
        debtEquity: metrics.debtEquity,
        currentRatio: metrics.currentRatio,
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
        roa: metrics.roa,
        roi: metrics.roi,
        debtEquity: metrics.debtEquity,
        currentRatio: metrics.currentRatio,
        income,
      },
      sec: secFacts
        ? { cik: secFacts.cik, name: secFacts.name, source: secFacts.source, filings: secFacts.filings }
        : null,
      dataSources: {
        quote: quote?.source || null,
        history: historySource,
        summary: Object.values(yahooSummary).some((value) => value != null) ? "yahoo-public" : null,
        sec: secFacts?.source || null,
        dividends: dividends.length ? "public-first-composite" : null,
      },
      usingRealData: Boolean(quote || history.length || yahooSummary.price != null || secFacts),
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
