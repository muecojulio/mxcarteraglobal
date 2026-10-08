import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Universo gratis (US acciones + ETFs + algunos MX). Limitado por rate limits free. */
const UNIVERSE: Array<{
  symbol: string;
  name: string;
  type: "stock" | "etf";
  region: "US" | "MX";
  currency: "USD" | "MXN";
}> = [
  { symbol: "AAPL", name: "Apple", type: "stock", region: "US", currency: "USD" },
  { symbol: "MSFT", name: "Microsoft", type: "stock", region: "US", currency: "USD" },
  { symbol: "GOOGL", name: "Alphabet", type: "stock", region: "US", currency: "USD" },
  { symbol: "AMZN", name: "Amazon", type: "stock", region: "US", currency: "USD" },
  { symbol: "NVDA", name: "NVIDIA", type: "stock", region: "US", currency: "USD" },
  { symbol: "META", name: "Meta", type: "stock", region: "US", currency: "USD" },
  { symbol: "JNJ", name: "Johnson & Johnson", type: "stock", region: "US", currency: "USD" },
  { symbol: "KO", name: "Coca-Cola", type: "stock", region: "US", currency: "USD" },
  { symbol: "PG", name: "Procter & Gamble", type: "stock", region: "US", currency: "USD" },
  { symbol: "JPM", name: "JPMorgan", type: "stock", region: "US", currency: "USD" },
  { symbol: "V", name: "Visa", type: "stock", region: "US", currency: "USD" },
  { symbol: "WMT", name: "Walmart", type: "stock", region: "US", currency: "USD" },
  { symbol: "XOM", name: "Exxon Mobil", type: "stock", region: "US", currency: "USD" },
  { symbol: "CVX", name: "Chevron", type: "stock", region: "US", currency: "USD" },
  { symbol: "ABBV", name: "AbbVie", type: "stock", region: "US", currency: "USD" },
  { symbol: "MRK", name: "Merck", type: "stock", region: "US", currency: "USD" },
  { symbol: "PEP", name: "PepsiCo", type: "stock", region: "US", currency: "USD" },
  { symbol: "CSCO", name: "Cisco", type: "stock", region: "US", currency: "USD" },
  { symbol: "INTC", name: "Intel", type: "stock", region: "US", currency: "USD" },
  { symbol: "IBM", name: "IBM", type: "stock", region: "US", currency: "USD" },
  { symbol: "O", name: "Realty Income", type: "stock", region: "US", currency: "USD" },
  { symbol: "T", name: "AT&T", type: "stock", region: "US", currency: "USD" },
  { symbol: "VZ", name: "Verizon", type: "stock", region: "US", currency: "USD" },
  { symbol: "SPY", name: "SPDR S&P 500", type: "etf", region: "US", currency: "USD" },
  { symbol: "QQQ", name: "Invesco QQQ", type: "etf", region: "US", currency: "USD" },
  { symbol: "VTI", name: "Vanguard Total Stock", type: "etf", region: "US", currency: "USD" },
  { symbol: "VOO", name: "Vanguard S&P 500", type: "etf", region: "US", currency: "USD" },
  { symbol: "SCHD", name: "Schwab US Dividend", type: "etf", region: "US", currency: "USD" },
  { symbol: "VIG", name: "Vanguard Dividend App.", type: "etf", region: "US", currency: "USD" },
  { symbol: "JEPI", name: "JPMorgan Equity Premium", type: "etf", region: "US", currency: "USD" },
  { symbol: "AMXL.MX", name: "América Móvil", type: "stock", region: "MX", currency: "MXN" },
  { symbol: "WALMEX.MX", name: "Walmart México", type: "stock", region: "MX", currency: "MXN" },
  { symbol: "GFNORTEO.MX", name: "Banorte", type: "stock", region: "MX", currency: "MXN" },
  { symbol: "FEMSAUBD.MX", name: "FEMSA", type: "stock", region: "MX", currency: "MXN" },
  { symbol: "BIMBOA.MX", name: "Bimbo", type: "stock", region: "MX", currency: "MXN" },
  { symbol: "JEPQ", name: "JPM Nasdaq Premium", type: "etf", region: "US", currency: "USD" },
  { symbol: "VNQ", name: "Vanguard Real Estate", type: "etf", region: "US", currency: "USD" },
  { symbol: "XLK", name: "Technology Sector", type: "etf", region: "US", currency: "USD" },
  { symbol: "FUNO11.MX", name: "Fibra UNO", type: "etf", region: "MX", currency: "MXN" },
  { symbol: "FMTY14.MX", name: "Fibra Mty", type: "etf", region: "MX", currency: "MXN" },
  { symbol: "DANHOS13.MX", name: "Fibra Danhos", type: "etf", region: "MX", currency: "MXN" },
  { symbol: "FIBRAPL14.MX", name: "Fibra Prologis", type: "etf", region: "MX", currency: "MXN" },
  { symbol: "FHIPO14.MX", name: "Fibra Hipotecaria", type: "etf", region: "MX", currency: "MXN" },
];

type MetricsRow = {
  symbol: string;
  name: string;
  type: "stock" | "etf";
  region: "US" | "MX";
  currency: "USD" | "MXN";
  price: number | null;
  priceMxn: number | null;
  pe: number | null;
  peg: number | null;
  pb: number | null;
  ps: number | null;
  roe: number | null;
  roa: number | null;
  roi: number | null;
  revGrowth: number | null;
  epsGrowth: number | null;
  divYield: number | null;
  divYieldPct: number | null;
  dividendFrequency: string | null;
  undervalued: boolean | null;
};

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Caché en memoria de OVERVIEW (25 req/día free → cachear 24h) */
const avCache = new Map<
  string,
  { at: number; data: Partial<MetricsRow> & { dividendFrequency?: string | null } }
>();
const AV_TTL_MS = 24 * 60 * 60 * 1000;
let avCallsToday = 0;
let avDayKey = "";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function avBudgetOk(maxPerRequest = 5) {
  const d = todayKey();
  if (d !== avDayKey) {
    avDayKey = d;
    avCallsToday = 0;
  }
  return avCallsToday < 20 && maxPerRequest > 0; // margen bajo el límite 25
}

async function alphaVantageOverview(
  symbol: string,
  apiKey: string
): Promise<Partial<MetricsRow> & { dividendFrequency?: string | null }> {
  const cached = avCache.get(symbol);
  if (cached && Date.now() - cached.at < AV_TTL_MS) {
    return cached.data;
  }
  if (!avBudgetOk()) return {};

  try {
    avCallsToday += 1;
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(
      symbol
    )}&apikey=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return {};
    const d = await res.json();
    // Rate limit / error messages
    if (d.Note || d.Information || !d.Symbol) {
      return {};
    }

    const pe = num(d.PERatio);
    const peg = num(d.PEGRatio);
    const pb = num(d.PriceToBookRatio);
    const ps = num(d.PriceToSalesRatioTTM);
    let roe = num(d.ReturnOnEquityTTM);
    let roa = num(d.ReturnOnAssetsTTM);
    // AV a veces trae fracción 0.15 = 15%
    if (roe != null && Math.abs(roe) < 1) roe = roe * 100;
    if (roa != null && Math.abs(roa) < 1) roa = roa * 100;

    let dy = num(d.DividendYield);
    if (dy != null && dy < 1) dy = dy * 100;

    const epsGrowth = num(d.QuarterlyEarningsGrowthYOY);
    const revGrowth = num(d.QuarterlyRevenueGrowthYOY);
    // growth a veces fracción
    const epsG =
      epsGrowth != null && Math.abs(epsGrowth) < 2
        ? epsGrowth * 100
        : epsGrowth;
    const revG =
      revGrowth != null && Math.abs(revGrowth) < 2
        ? revGrowth * 100
        : revGrowth;

    let dividendFrequency: string | null = null;
    if (d.DividendPerShare && Number(d.DividendPerShare) > 0) {
      dividendFrequency = "Trimestral (típ.)";
    }

    const data: Partial<MetricsRow> & { dividendFrequency?: string | null } = {
      pe,
      peg,
      pb,
      ps,
      roe,
      roa,
      divYieldPct: dy,
      divYield: dy,
      epsGrowth: epsG,
      revGrowth: revG,
      dividendFrequency,
    };
    avCache.set(symbol, { at: Date.now(), data });
    return data;
  } catch {
    return {};
  }
}

function mergeMetrics(
  base: Partial<MetricsRow>,
  extra: Partial<MetricsRow>
): Partial<MetricsRow> {
  const out: Partial<MetricsRow> = { ...base };
  (Object.keys(extra) as (keyof MetricsRow)[]).forEach((key) => {
    const v = extra[key];
    if (v != null && (out[key] == null || out[key] === undefined)) {
      (out as Record<string, unknown>)[key as string] = v;
    }
  });
  if (extra.peg != null && base.peg == null) {
    out.peg = extra.peg;
  }
  return out;
}


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
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const d = await res.json();
      if (d?.rates?.MXN) return Number(d.rates.MXN);
    }
  } catch {
    /* */
  }
  return 17;
}

async function finnhubMetrics(
  symbol: string,
  token: string
): Promise<Partial<MetricsRow>> {
  try {
    const [metricRes, quoteRes] = await Promise.all([
      fetch(
        `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(
          symbol
        )}&metric=all&token=${token}`,
        { next: { revalidate: 3600 } }
      ),
      fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
          symbol
        )}&token=${token}`,
        { next: { revalidate: 60 } }
      ),
    ]);
    const out: Partial<MetricsRow> = {};
    if (quoteRes.ok) {
      const q = await quoteRes.json();
      out.price = num(q.c);
    }
    if (metricRes.ok) {
      const data = await metricRes.json();
      const m = data.metric || {};
      out.pe = num(m.peBasicExclExtraTTM ?? m.peNormalizedAnnual);
      out.peg = num(m.pegRatio ?? m.pegTTM);
      out.pb = num(m.pbAnnual ?? m.pbQuarterly);
      out.ps = num(m.psAnnual ?? m.psTTM);
      out.roe = num(m.roeTTM ?? m.roeAnnual);
      out.roa = num(m.roaTTM ?? m.roaAnnual);
      out.roi = num(m.roiTTM ?? m.roiAnnual);
      out.revGrowth = num(m.revenueGrowthTTMYoy ?? m.revenueGrowth3Y);
      out.epsGrowth = num(m.epsGrowthTTMYoy ?? m.epsGrowth3Y);
      const dy = num(
        m.dividendYieldIndicatedAnnual ?? m.currentDividendYieldTTM
      );
      // Finnhub sometimes returns percent (0.35) vs fraction — normalize to %
      if (dy != null) {
        out.divYieldPct = dy < 1 ? dy * 100 : dy;
        out.divYield = out.divYieldPct;
      }
    }
    return out;
  } catch {
    return {};
  }
}

async function fmpRatios(
  symbol: string,
  key: string
): Promise<Partial<MetricsRow>> {
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/stable/ratios-ttm?symbol=${encodeURIComponent(
        symbol
      )}&apikey=${key}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return {};
    const list = await res.json();
    const r = Array.isArray(list) ? list[0] : null;
    if (!r) return {};
    const out: Partial<MetricsRow> = {};
    out.pe = num(r.priceToEarningsRatioTTM) ?? null;
    out.pb = num(r.priceToBookRatioTTM) ?? null;
    out.ps = num(r.priceToSalesRatioTTM) ?? null;
    out.roe =
      num(r.returnOnEquityTTM) != null
        ? Number(r.returnOnEquityTTM) * (Math.abs(Number(r.returnOnEquityTTM)) < 1 ? 100 : 1)
        : null;
    out.roa =
      num(r.returnOnAssetsTTM) != null
        ? Number(r.returnOnAssetsTTM) * (Math.abs(Number(r.returnOnAssetsTTM)) < 1 ? 100 : 1)
        : null;
    const dy = num(r.dividendYieldTTM);
    if (dy != null) out.divYieldPct = dy < 1 ? dy * 100 : dy;
    return out;
  } catch {
    return {};
  }
}

/**
 * GET /api/metrics?type=stock|etf|all
 * &peMax=15&pegMax=1&pbMax=1.5&psMax=2
 * &roeMin=10&roaMin=10&roiMin=10
 * &revGrowthMin=10&epsGrowthMin=10
 * &undervalued=1
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const type = (sp.get("type") || "all") as "stock" | "etf" | "all";
  const peMax = sp.get("peMax") != null ? Number(sp.get("peMax")) : null;
  const pegMax = sp.get("pegMax") != null ? Number(sp.get("pegMax")) : null;
  const pbMax = sp.get("pbMax") != null ? Number(sp.get("pbMax")) : null;
  const psMax = sp.get("psMax") != null ? Number(sp.get("psMax")) : null;
  const roeMin = sp.get("roeMin") != null ? Number(sp.get("roeMin")) : null;
  const roaMin = sp.get("roaMin") != null ? Number(sp.get("roaMin")) : null;
  const roiMin = sp.get("roiMin") != null ? Number(sp.get("roiMin")) : null;
  const revGrowthMin =
    sp.get("revGrowthMin") != null ? Number(sp.get("revGrowthMin")) : null;
  const epsGrowthMin =
    sp.get("epsGrowthMin") != null ? Number(sp.get("epsGrowthMin")) : null;
  const undervaluedOnly = sp.get("undervalued") === "1";
  const preset = sp.get("preset"); // value | quality | income

  const finnhub = process.env.FINNHUB_API_KEY?.trim();
  const fmp = process.env.FMP_API_KEY?.trim();
  const usdMxn = await fetchUsdMxn();

  let list = UNIVERSE.filter((u) =>
    type === "all" ? true : u.type === type
  );

  // Aplicar presets de filtros si no hay params explícitos
  let filters = {
    peMax,
    pegMax,
    pbMax,
    psMax,
    roeMin,
    roaMin,
    roiMin,
    revGrowthMin,
    epsGrowthMin,
    undervaluedOnly,
  };
  if (preset === "value") {
    filters = {
      peMax: peMax ?? 12,
      pegMax: pegMax ?? 1,
      pbMax: pbMax ?? 1.5,
      psMax: psMax ?? 2,
      roeMin: null,
      roaMin: null,
      roiMin: null,
      revGrowthMin: null,
      epsGrowthMin: null,
      undervaluedOnly: true,
    };
  } else if (preset === "quality") {
    filters = {
      peMax: peMax ?? 25,
      pegMax: pegMax ?? 1.5,
      pbMax: null,
      psMax: null,
      roeMin: roeMin ?? 10,
      roaMin: roaMin ?? 10,
      roiMin: roiMin ?? 10,
      revGrowthMin: revGrowthMin ?? 10,
      epsGrowthMin: epsGrowthMin ?? 10,
      undervaluedOnly: false,
    };
  }

  const rows: MetricsRow[] = [];

  // Secuencial suave para no saturar free tier
  for (const u of list) {
    let partial: Partial<MetricsRow> = {};
    if (u.region === "US" && finnhub) {
      partial = await finnhubMetrics(u.symbol, finnhub);
      // completar huecos con FMP
      if (fmp && (partial.pe == null || partial.pb == null)) {
        const f = await fmpRatios(u.symbol, fmp);
        partial = mergeMetrics(partial, f);
      }
      // Alpha Vantage OVERVIEW: PEG y huecos (máx ~20/día, cache 24h)
      const avKey = process.env.ALPHA_VANTAGE_API_KEY?.trim();
      if (
        avKey &&
        avBudgetOk() &&
        (partial.peg == null ||
          partial.pe == null ||
          partial.roe == null ||
          partial.divYieldPct == null)
      ) {
        const av = await alphaVantageOverview(u.symbol, avKey);
        const freq = av.dividendFrequency;
        partial = mergeMetrics(partial, av);
        if (freq && !partial.dividendFrequency) {
          // dividendFrequency se aplica más abajo desde partial extendido
          (partial as MetricsRow).dividendFrequency = freq;
        }
      }
    } else if (u.region === "MX") {
      // Precio vía nuestro quote interno si es posible
      try {
        const base =
          process.env.VERCEL_URL != null
            ? `https://${process.env.VERCEL_URL}`
            : "http://127.0.0.1:3000";
        // usar DataBursatil / composite a través de finnhub no sirve para .MX
        // Dejamos métricas null; precio se intenta con Yahoo
        const yRes = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
            u.symbol
          )}?interval=1d&range=1d`,
          {
            headers: { "User-Agent": "Mozilla/5.0" },
            next: { revalidate: 120 },
          }
        );
        if (yRes.ok) {
          const yd = await yRes.json();
          const price = yd?.chart?.result?.[0]?.meta?.regularMarketPrice;
          partial.price = num(price);
        }
      } catch {
        /* */
      }
    }

    const price = partial.price ?? null;
    const priceMxn =
      price == null
        ? null
        : u.currency === "MXN"
        ? price
        : price * usdMxn;

    const pe = partial.pe ?? null;
    const pb = partial.pb ?? null;
    const ps = partial.ps ?? null;
    // Heurística infravalorada: PE bajo + PB < 1.5 o PS < 2
    let undervalued: boolean | null = null;
    if (pe != null || pb != null || ps != null) {
      const peOk = pe != null && pe > 0 && pe <= 15;
      const pbOk = pb != null && pb > 0 && pb <= 1.5;
      const psOk = ps != null && ps > 0 && ps <= 2;
      undervalued = Boolean(peOk || (pbOk && psOk) || (peOk && pbOk));
    }

    // Frecuencia aproximada por yield ETFs conocidos / acciones
    let dividendFrequency: string | null = null;
    if (u.type === "etf") {
      if (["O", "JEPI"].includes(u.symbol) || u.symbol === "O")
        dividendFrequency = u.symbol === "O" || u.symbol === "JEPI" ? "Mensual" : null;
      if (["SCHD", "VIG", "SPY", "QQQ", "VTI", "VOO"].includes(u.symbol))
        dividendFrequency = "Trimestral";
      if (u.symbol === "JEPI" || u.symbol === "O") dividendFrequency = "Mensual";
    } else if ((partial.divYieldPct ?? 0) > 0) {
      dividendFrequency = "Trimestral (típ.)";
    }
    if (partial.dividendFrequency) {
      dividendFrequency = partial.dividendFrequency;
    }

    const row: MetricsRow = {
      symbol: u.symbol,
      name: u.name,
      type: u.type,
      region: u.region,
      currency: u.currency,
      price,
      priceMxn,
      pe,
      peg: partial.peg ?? null,
      pb,
      ps,
      roe: partial.roe ?? null,
      roa: partial.roa ?? null,
      roi: partial.roi ?? null,
      revGrowth: partial.revGrowth ?? null,
      epsGrowth: partial.epsGrowth ?? null,
      divYield: partial.divYield ?? null,
      divYieldPct: partial.divYieldPct ?? null,
      dividendFrequency,
      undervalued,
    };

    // Filtros
    if (filters.peMax != null && (row.pe == null || row.pe > filters.peMax || row.pe <= 0))
      continue;
    if (filters.pegMax != null && (row.peg == null || row.peg > filters.pegMax))
      continue;
    if (filters.pbMax != null && (row.pb == null || row.pb > filters.pbMax || row.pb <= 0))
      continue;
    if (filters.psMax != null && (row.ps == null || row.ps > filters.psMax || row.ps <= 0))
      continue;
    if (filters.roeMin != null && (row.roe == null || row.roe < filters.roeMin))
      continue;
    if (filters.roaMin != null && (row.roa == null || row.roa < filters.roaMin))
      continue;
    if (filters.roiMin != null && (row.roi == null || row.roi < filters.roiMin))
      continue;
    if (
      filters.revGrowthMin != null &&
      (row.revGrowth == null || row.revGrowth < filters.revGrowthMin)
    )
      continue;
    if (
      filters.epsGrowthMin != null &&
      (row.epsGrowth == null || row.epsGrowth < filters.epsGrowthMin)
    )
      continue;
    if (filters.undervaluedOnly && !row.undervalued) continue;

    rows.push(row);
  }

  // Orden: primero más "baratos" por PE si existe
  rows.sort((a, b) => {
    if (a.pe != null && b.pe != null) return a.pe - b.pe;
    if (a.pe != null) return -1;
    if (b.pe != null) return 1;
    return a.symbol.localeCompare(b.symbol);
  });

  return NextResponse.json({
    usdMxn,
    count: rows.length,
    universe: list.length,
    filters: filters,
    alphaVantage: {
      callsToday: avCallsToday,
      cacheSize: avCache.size,
      configured: Boolean(process.env.ALPHA_VANTAGE_API_KEY?.trim()),
    },
    results: rows,
    note:
      "US: Finnhub + FMP + Alpha Vantage (OVERVIEW, cache 24h, cupo diario). MX: precio Yahoo. No es consejo de inversión.",
  });
}
