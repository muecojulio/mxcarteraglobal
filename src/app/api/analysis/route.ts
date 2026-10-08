import { NextRequest, NextResponse } from "next/server";
import { sanitizeSymbol } from "@/lib/sanitize";
import { getMarketDataProvider, detectRegion, isExcludedInstrument, normalizeYahooSymbol } from "@/lib/market-data";
import { freeYahooSummary, publicSecCompanyFacts } from "@/lib/free-finance";
import { withCachePolicy } from "@/lib/http-cache";

export const dynamic = "force-dynamic";

type Metrics = Record<string, number | string | null | undefined>;

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function buildAnalysis(input: {
  symbol: string;
  name: string;
  price?: number;
  changePercent?: number;
  currency?: string;
  region: string;
  metrics: Metrics;
}): {
  summary: string;
  sections: Array<{ title: string; points: string[] }>;
  signal: {
    action: "zona_baja" | "observar" | "precaucion";
    label: string;
    reason: string;
  };
  disclaimer: string;
} {
  const { symbol, name, price, changePercent, currency, region, metrics } = input;
  const pe = num(metrics.pe);
  const pb = num(metrics.pb);
  const roe = num(metrics.roe);
  const debtEquity = num(metrics.debtEquity);
  const currentRatio = num(metrics.currentRatio);
  const divYield = num(metrics.divYield);
  const mcap = num(metrics.marketCap);
  const high52 = num(metrics.high52);
  const low52 = num(metrics.low52);

  const sections: Array<{ title: string; points: string[] }> = [];

  // Precio / momentum
  const pricePoints: string[] = [];
  if (price != null) {
    pricePoints.push(
      `Cotización reciente: ${price.toLocaleString("es-MX", {
        maximumFractionDigits: 2,
      })} ${currency || ""}`.trim()
    );
  }
  if (changePercent != null) {
    pricePoints.push(
      `Variación del día: ${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%`
    );
  }
  if (high52 != null && low52 != null && price != null) {
    const pos = ((price - low52) / (high52 - low52)) * 100;
    pricePoints.push(
      `Rango 52 semanas: ${low52.toFixed(2)} – ${high52.toFixed(2)} (posición aprox. ${pos.toFixed(0)}%)`
    );
  }
  if (pricePoints.length) {
    sections.push({ title: "Precio y momentum", points: pricePoints });
  }

  // Valoración
  const valPoints: string[] = [];
  if (pe != null) {
    let comment = "en línea con muchas empresas de crecimiento";
    if (pe < 15) comment = "relativamente bajo (puede indicar valor o menor crecimiento esperado)";
    else if (pe > 35) comment = "elevado (el mercado espera mucho crecimiento o hay prima de calidad)";
    valPoints.push(`PER (P/E) aprox.: ${pe.toFixed(1)} — ${comment}`);
  }
  if (pb != null) {
    valPoints.push(`Precio / valor en libros (P/B): ${pb.toFixed(2)}`);
  }
  if (mcap != null) {
    const capStr =
      mcap > 1_000_000
        ? `${(mcap / 1_000_000).toFixed(2)} B` // if already in millions from finnhub
        : mcap > 1e12
        ? `${(mcap / 1e12).toFixed(2)} T`
        : mcap > 1e9
        ? `${(mcap / 1e9).toFixed(2)} B`
        : `${(mcap / 1e6).toFixed(1)} M`;
    valPoints.push(`Capitalización de mercado (dato fuente): ~${capStr}`);
  }
  if (valPoints.length) {
    sections.push({ title: "Valoración", points: valPoints });
  }

  // Rentabilidad y balance
  const fundPoints: string[] = [];
  if (roe != null) {
    fundPoints.push(
      `ROE: ${roe.toFixed(1)}% ${
        roe > 20 ? "(rentabilidad sobre capital alta)" : roe > 10 ? "(moderada)" : "(baja)"
      }`
    );
  }
  if (debtEquity != null) {
    fundPoints.push(
      `Deuda / patrimonio: ${debtEquity.toFixed(2)} ${
        debtEquity > 2
          ? "(apalancamiento alto)"
          : debtEquity > 1
          ? "(apalancamiento moderado-alto)"
          : "(apalancamiento moderado o bajo)"
      }`
    );
  }
  if (currentRatio != null) {
    fundPoints.push(
      `Ratio corriente: ${currentRatio.toFixed(2)} ${
        currentRatio < 1
          ? "(liquidez de corto plazo ajustada)"
          : "(liquidez de corto plazo razonable)"
      }`
    );
  }
  if (fundPoints.length) {
    sections.push({ title: "Rentabilidad y balance", points: fundPoints });
  }

  // Dividendos
  if (divYield != null && divYield > 0) {
    const y = divYield < 1 ? divYield * 100 : divYield; // FMP often fraction
    sections.push({
      title: "Dividendos",
      points: [
        `Yield indicado aprox.: ${y.toFixed(2)}% anual`,
        "Revisa la sección Dividendos de la app para el historial de pagos.",
      ],
    });
  }

  // Riesgos genéricos
  const risks: string[] = [
    "Los múltiplos y ratios cambian con el precio y los resultados; no garantizan rendimiento futuro.",
    "Este resumen es automático a partir de datos públicos y puede estar incompleto o desfasado.",
  ];
  if (region === "MX") {
    risks.push(
      "Para emisoras mexicanas, parte de los fundamentales profundos puede no estar en las APIs gratuitas."
    );
  }
  sections.push({ title: "Riesgos y limitaciones", points: risks });

  const tone =
    pe != null && pe > 40
      ? "El mercado parece pagar una prima elevada por crecimiento o calidad."
      : pe != null && pe < 12
      ? "La valoración por PER es relativamente contenida frente a muchas grandes tecnológicas."
      : "La foto combina valoración, rentabilidad y balance según los datos disponibles.";

  const summary = `${name} (${symbol}): ${tone} Región: ${region}.`;

  // Señal orientativa (reglas simples sobre datos públicos; NO es consejo de inversión)
  let score = 0;
  const reasons: string[] = [];
  if (pe != null) {
    if (pe > 0 && pe < 18) {
      score += 2;
      reasons.push("PER relativamente moderado");
    } else if (pe >= 18 && pe <= 30) {
      score += 1;
      reasons.push("PER en zona intermedia");
    } else if (pe > 40) {
      score -= 2;
      reasons.push("PER muy alto (precio exige mucho crecimiento)");
    } else if (pe > 30) {
      score -= 1;
      reasons.push("PER elevado");
    }
  }
  if (roe != null) {
    if (roe >= 15) {
      score += 2;
      reasons.push("ROE sólido");
    } else if (roe >= 8) {
      score += 1;
    } else if (roe < 5) {
      score -= 1;
      reasons.push("ROE bajo");
    }
  }
  if (debtEquity != null) {
    if (debtEquity < 1) {
      score += 1;
      reasons.push("Deuda controlada");
    } else if (debtEquity > 2) {
      score -= 1;
      reasons.push("Deuda elevada");
    }
  }
  if (high52 != null && low52 != null && price != null && high52 > low52) {
    const pos = (price - low52) / (high52 - low52);
    if (pos > 0.85) {
      score -= 1;
      reasons.push("Cerca de máximos de 52 semanas");
    } else if (pos < 0.35) {
      score += 1;
      reasons.push("Más cerca de mínimos de 52 semanas");
    }
  }
  if (changePercent != null && changePercent < -5) {
    score -= 1;
    reasons.push("Caída fuerte del día (volatilidad)");
  }

  let action: "zona_baja" | "observar" | "precaucion" = "observar";
  let label = "Esperar";
  if (score >= 3) {
    action = "zona_baja";
    label = "Precio en zona baja del rango (contexto)";
  } else if (score <= -2) {
    action = "precaucion";
    label = "Precaución: lectura mixta o cara vs. rango";
  } else {
    action = "observar";
    label = "Esperar";
  }

  const signal = {
    action,
    label,
    reason:
      reasons.slice(0, 3).join(". ") ||
      "Datos insuficientes para una lectura fuerte; no hay conclusión.",
  };

  return {
    summary,
    sections,
    signal,
    disclaimer:
      "Información generada automáticamente con fines educativos. No es asesoramiento financiero, ni recomendación de compra o venta. Tú decides con tu propio criterio y, si hace falta, con un profesional.",
  };
}

async function get(req: NextRequest) {
  const symbol = sanitizeSymbol(req.nextUrl.searchParams.get("symbol"));
  if (!symbol) {
    return NextResponse.json({ error: "symbol requerido" }, { status: 400 });
  }
  if (isExcludedInstrument(symbol)) {
    return NextResponse.json({ error: "Forex y criptomonedas están excluidos del análisis bursátil." }, { status: 400 });
  }

  const provider = getMarketDataProvider();
  const sym = normalizeYahooSymbol(symbol);
  const region = detectRegion(sym);
  const finnhub = process.env.FINNHUB_API_KEY?.trim();
  const fmp = process.env.FMP_API_KEY?.trim();

  try {
    const [quote, yahooSummary, secFacts] = await Promise.all([
      provider.getQuote(sym),
      freeYahooSummary(sym),
      region === "US" ? publicSecCompanyFacts(sym) : Promise.resolve(null),
    ]);
    const metrics: Metrics = {
      pe: yahooSummary.pe,
      pb: yahooSummary.pb,
      peg: yahooSummary.peg,
      roe: yahooSummary.roe,
      roa: yahooSummary.roa,
      roi: yahooSummary.roi,
      debtEquity: yahooSummary.debtEquity,
      currentRatio: yahooSummary.currentRatio,
      divYield: yahooSummary.divYield,
      high52: yahooSummary.high52,
      low52: yahooSummary.low52,
      marketCap: yahooSummary.marketCap,
    };
    const secFinancials = secFacts?.financials || [];
    const latest = secFinancials[secFinancials.length - 1];
    if (latest) {
      if (metrics.roe == null && latest.netIncome != null && latest.equity) {
        metrics.roe = (latest.netIncome / latest.equity) * 100;
      }
      if (metrics.debtEquity == null && latest.liabilities != null && latest.equity) {
        metrics.debtEquity = latest.liabilities / latest.equity;
      }
      if (metrics.marketCap == null && quote?.marketCap != null) {
        metrics.marketCap = quote.marketCap;
      }
    }

    // Finnhub metrics (US)
    if (finnhub && region === "US") {
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
          metrics.pe ??= m.peBasicExclExtraTTM ?? m.peNormalizedAnnual;
          metrics.roe ??= m.roeTTM;
          metrics.debtEquity ??= m["totalDebt/totalEquityAnnual"];
          metrics.divYield ??= m.dividendYieldIndicatedAnnual;
          metrics.high52 ??= m["52WeekHigh"];
          metrics.low52 ??= m["52WeekLow"];
          metrics.marketCap ??= m.marketCapitalization;
        }
      } catch {
        /* ignore */
      }
    }

    // FMP ratios/metrics (US)
    if (fmp && region === "US") {
      try {
        const [ratiosRes, kmRes] = await Promise.all([
          fetch(
            `https://financialmodelingprep.com/stable/ratios?symbol=${encodeURIComponent(
              sym
            )}&apikey=${fmp}`,
            { next: { revalidate: 3600 } }
          ),
          fetch(
            `https://financialmodelingprep.com/stable/key-metrics?symbol=${encodeURIComponent(
              sym
            )}&apikey=${fmp}`,
            { next: { revalidate: 3600 } }
          ),
        ]);
        if (ratiosRes.ok) {
          const ratios = await ratiosRes.json();
          if (Array.isArray(ratios) && ratios[0]) {
            const r = ratios[0];
            if (metrics.pe == null) metrics.pe = r.priceToEarningsRatio;
            if (metrics.pb == null) metrics.pb = r.priceToBookRatio;
            if (metrics.debtEquity == null)
              metrics.debtEquity = r.debtToEquityRatio;
            if (metrics.currentRatio == null) metrics.currentRatio = r.currentRatio;
            if (metrics.divYield == null && r.dividendYield != null)
              metrics.divYield = r.dividendYield;
          }
        }
        if (kmRes.ok) {
          const km = await kmRes.json();
          if (Array.isArray(km) && km[0]) {
            if (metrics.marketCap == null) metrics.marketCap = km[0].marketCap;
            if (metrics.currentRatio == null)
              metrics.currentRatio = km[0].currentRatio;
          }
        }
      } catch {
        /* ignore */
      }
    }

    const name = quote?.name || yahooSummary.name || secFacts?.name || sym;
    const analysis = buildAnalysis({
      symbol: sym,
      name,
      price: quote?.price,
      changePercent: quote?.changePercent,
      currency: quote?.currency,
      region,
      metrics,
    });

    return NextResponse.json({
      symbol: sym,
      name,
      region,
      quote,
      metrics,
      analysis,
      sources: {
        quote: quote?.source || null,
        fundamentals: Object.values(yahooSummary).some((value) => value != null) ? "yahoo-public" : null,
        sec: secFacts?.source || null,
        configuredFallbacks: [
          ...(finnhub ? ["finnhub"] : []),
          ...(fmp ? ["fmp"] : []),
        ],
      },
      analysisMethod: "Reglas deterministas sobre datos públicos; no se usa un modelo de IA externo ni se inventan cifras.",
      usingRealData: Boolean(quote || yahooSummary.price != null),
    });
  } catch (err) {
    console.error("Analysis error:", err);
    return NextResponse.json(
      { error: "Error al generar análisis" },
      { status: 500 }
    );
  }
}

export const GET = withCachePolicy("/api/analysis", get);
