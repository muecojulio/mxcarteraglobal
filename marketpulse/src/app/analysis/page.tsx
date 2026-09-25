"use client";
import { useState } from "react";
import Link from "next/link";
type AnalysisResult = {
  symbol: string; name: string; region: string;
  quote?: { price: number; changePercent: number; currency: string };
  analysis: { summary: string; sections: Array<{ title: string; points: string[] }>; signal?: { action: "zona_baja" | "observar" | "precaucion"; label: string; reason: string }; disclaimer: string };
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
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || `HTTP ${res.status}`); }
      setResult(await res.json());
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); setResult(null); }
    finally { setLoading(false); }
  };
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto"><h1 className="text-lg font-bold">Análisis</h1></div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pb-10">
        <p className="text-xs text-muted pt-3 pb-3">Resumen con cotización y ratios públicos. No es asesoría.</p>
        <div className="flex gap-2 mb-3">
          <input value={symbol} onChange={(e) => setSymbol(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()} placeholder="Ej. AAPL" className="flex-1 bg-card border border-border rounded-xl py-2.5 px-3 text-sm" />
          <button onClick={() => run()} disabled={loading} className="ui-btn ui-btn-primary">{loading ? "…" : "Analizar"}</button>
        </div>
        <div className="flex flex-wrap gap-2 mb-6">{SUGGESTIONS.map((s) => <button key={s} onClick={() => run(s)} className="ui-chip">{s}</button>)}</div>
        {error && <p className="text-sm text-danger text-center py-6">{error}</p>}
        {result && !loading && (
          <div className="space-y-4">
            <div className="bg-card rounded-2xl border border-border p-4">
              <p className="font-bold text-lg">{result.symbol}</p>
              <p className="text-sm text-muted">{result.name}</p>
              <p className="text-sm mt-3">{result.analysis.summary}</p>
              <Link href={`/asset/${encodeURIComponent(result.symbol)}`} className="inline-block mt-3 text-xs text-primary font-medium">Ver ficha</Link>
            </div>
            {result.analysis.sections.map((sec) => (
              <section key={sec.title} className="bg-card rounded-xl border border-border p-4">
                <h2 className="text-xs font-semibold text-muted uppercase mb-2">{sec.title}</h2>
                <ul className="space-y-2">{sec.points.map((p, i) => <li key={i} className="text-sm">{p}</li>)}</ul>
              </section>
            ))}
            <p className="text-[11px] text-muted text-center">{result.analysis.disclaimer}</p>
          </div>
        )}
      </main>
    </div>
  );
}
