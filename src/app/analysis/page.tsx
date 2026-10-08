"use client";

import { useState } from "react";
import Link from "next/link";

type AnalysisResult = {
  symbol: string;
  name: string;
  region: string;
  quote?: {
    price: number;
    changePercent: number;
    currency: string;
  };
  analysis: {
    summary: string;
    sections: Array<{ title: string; points: string[] }>;
    signal?: {
      action: "zona_baja" | "observar" | "precaucion";
      label: string;
      reason: string;
    };
    disclaimer: string;
  };
};

const SUGGESTIONS = [
  "AAPL",
  "MSFT",
  "NVDA",
  "AMXL.MX",
  "WALMEX.MX",
  "GFNORTEO.MX",
  "SAP.DE",
];

export default function AnalysisPage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const run = async (sym?: string) => {
    const s = (sym || symbol).trim().toUpperCase();
    if (!s) return;
    setSymbol(s);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/analysis?symbol=${encodeURIComponent(s)}`
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto">
          <h1 className="text-lg font-bold">Análisis</h1>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 pb-10">
        <p className="text-xs text-muted pt-3 pb-3 leading-relaxed">
          Resumen automático con cotización y ratios públicos (PER, ROE, deuda,
          dividendos…). No usa un chatbot de pago: interpreta datos reales de
          las APIs.
        </p>

        {/* Buscador */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="Ej. AAPL, AMXL.MX"
            className="flex-1 bg-card border border-border rounded-xl py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            onClick={() => run()}
            disabled={loading}
            className="px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
          >
            {loading ? "…" : "Analizar"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => run(s)}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-card border border-border"
            >
              {s}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-sm text-danger text-center py-6">{error}</p>
        )}

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 bg-card rounded-xl border border-border animate-pulse"
              />
            ))}
          </div>
        )}

        {result && !loading && (
          <div className="space-y-4">
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-lg">{result.symbol}</p>
                  <p className="text-sm text-muted">{result.name}</p>
                </div>
                {result.quote && (
                  <div className="text-right">
                    <p className="font-semibold">
                      {result.quote.price.toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      <span className="text-xs text-muted">
                        {result.quote.currency}
                      </span>
                    </p>
                    <p
                      className={`text-xs font-medium ${
                        result.quote.changePercent >= 0
                          ? "text-success"
                          : "text-danger"
                      }`}
                    >
                      {result.quote.changePercent >= 0 ? "+" : ""}
                      {result.quote.changePercent.toFixed(2)}%
                    </p>
                  </div>
                )}
              </div>
              <p className="text-sm mt-3 leading-relaxed">
                {result.analysis.summary}
              </p>
              {result.analysis.signal && (
                <div
                  className={`mt-4 rounded-xl border p-4 ${
                    result.analysis.signal.action === "zona_baja"
                      ? "bg-success/10 border-success/30"
                      : result.analysis.signal.action === "precaucion"
                      ? "bg-danger/10 border-danger/30"
                      : "bg-amber-500/10 border-amber-500/30"
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted mb-1">
                    Orientación automática
                  </p>
                  <p className="text-base font-bold">
                    {result.analysis.signal.action === "zona_baja" && "✅ "}
                    {result.analysis.signal.action === "observar" && "⏸️ "}
                    {result.analysis.signal.action === "precaucion" && "⚠️ "}
                    {result.analysis.signal.label}
                  </p>
                  <p className="text-sm text-muted mt-1 leading-relaxed">
                    {result.analysis.signal.reason}
                  </p>
                  <p className="text-[11px] text-muted mt-2">
                    No es una orden de compra ni de venta. Solo una lectura de
                    los números disponibles.
                  </p>
                </div>
              )}
              <Link
                href={`/asset/${encodeURIComponent(result.symbol)}`}
                className="inline-block mt-3 text-xs text-primary font-medium"
              >
                Ver ficha completa →
              </Link>
            </div>

            {result.analysis.sections.map((sec) => (
              <section
                key={sec.title}
                className="bg-card rounded-xl border border-border p-4"
              >
                <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                  {sec.title}
                </h2>
                <ul className="space-y-2">
                  {sec.points.map((p, i) => (
                    <li
                      key={i}
                      className="text-sm leading-relaxed flex gap-2"
                    >
                      <span className="text-primary mt-1.5">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <p className="text-[11px] text-muted text-center leading-relaxed px-2">
              {result.analysis.disclaimer}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
