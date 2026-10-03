"use client";
import { useState } from "react";
import Link from "next/link";
type AnalysisResult = {
  symbol: string;
  name: string;
  region: string;
  quote?: { price: number; changePercent: number; currency: string };
  analysis: { summary: string; sections: Array<{ title: string; points: string[] }>; signal?: { action: string; label: string; reason: string }; disclaimer: string };
};
const SUGGESTIONS = ["AAPL", "MSFT", "NVDA", "AMXL.MX", "WALMEX.MX", "GFNORTEO.MX", "SAP.DE"];
export default function AnalysisPage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const run = async (sym?: string) => {
    const s = (sym || symbol).trim().toUpperCase();
    if (!s) return;
    setSymbol(s); setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/analysis?symbol=${encodeURIComponent(s)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); setResult(null); }
    finally { setLoading(false); }
  };
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto"><h1 className="text-lg font-bold">Análisis</h1></div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pb-10">
        <p className="text-xs text-muted pt-3 pb-3">Resumen automático con cotización y ratios públicos (PER, ROE, deuda, dividendos…). No usa un chatbot de pago.</p>
        <div className="flex gap-2 mb-3">
          <input className="ui-input flex-1" value={symbol} onChange={(e) => setSymbol(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void run()} placeholder="Ej. AAPL, AMXL.MX" />
          <button type="button" className="ui-btn ui-btn-primary" disabled={loading} onClick={() => void run()}>{loading ? "…" : "Analizar"}</button>
        </div>
        <div className="flex flex-wrap gap-2 mb-6">{SUGGESTIONS.map((s) => <button key={s} type="button" className="ui-chip" onClick={() => void run(s)}>{s}</button>)}</div>
        {error ? <p className="text-sm text-danger text-center py-6">{error}</p> : null}
        {loading ? <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-card border border-border rounded-xl animate-pulse" />)}</div> : null}
        {result ? (
          <div className="space-y-3">
            <Link href={`/asset/${encodeURIComponent(result.symbol)}`} className="block bg-card border border-border rounded-xl p-3">
              <p className="font-semibold">{result.symbol} · {result.name}</p>
              {result.quote ? <p className="text-xs text-muted">{result.quote.price} {result.quote.currency} · {result.quote.changePercent}%</p> : null}
            </Link>
            {result.analysis.signal ? <p className="text-sm">{result.analysis.signal.label}: {result.analysis.signal.reason}</p> : null}
            <p className="text-sm">{result.analysis.summary}</p>
            {result.analysis.sections.map((sec) => (
              <section key={sec.title} className="bg-card border border-border rounded-xl p-3">
                <h2 className="text-sm font-semibold mb-1">{sec.title}</h2>
                {sec.points.map((pt) => <p key={pt} className="text-xs text-muted">• {pt}</p>)}
              </section>
            ))}
            <p className="text-[10px] text-muted">{result.analysis.disclaimer}</p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
