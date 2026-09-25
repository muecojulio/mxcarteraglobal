"use client";
import { useState } from "react";
import Link from "next/link";
type AnalysisResult = { symbol: string; name: string; region: string; quote?: { price: number; changePercent: number; currency: string }; analysis: { summary: string; sections: Array<{ title: string; points: string[] }>; signal?: { action: string; label: string; reason: string }; disclaimer: string } };
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResult(await res.json());
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); setResult(null); }
    finally { setLoading(false); }
  };
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto"><h1 className="text-lg font-bold">Análisis</h1></div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        <input className="ui-input" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
        <button type="button" className="ui-btn ui-btn-primary w-full" onClick={() => void run()}>{loading ? "Analizando…" : "Analizar"}</button>
        <div className="flex flex-wrap gap-2">{SUGGESTIONS.map((s) => <button key={s} type="button" className="ui-chip" onClick={() => void run(s)}>{s}</button>)}</div>
        {error ? <p className="text-danger text-sm">{error}</p> : null}
        {result ? (
          <div className="bg-card border border-border rounded-xl p-3 space-y-2">
            <p className="font-semibold">{result.symbol} · {result.name}</p>
            {result.quote ? <p className="text-sm">{result.quote.price} {result.quote.currency} ({result.quote.changePercent.toFixed(2)}%)</p> : null}
            {result.analysis.signal ? <p className="text-sm">{result.analysis.signal.label}: {result.analysis.signal.reason}</p> : null}
            <p className="text-sm text-muted">{result.analysis.summary}</p>
            {result.analysis.sections.map((sec) => (
              <div key={sec.title}><p className="text-xs font-semibold uppercase text-muted">{sec.title}</p><ul className="text-sm list-disc pl-4">{sec.points.map((p) => <li key={p}>{p}</li>)}</ul></div>
            ))}
            <p className="text-[11px] text-muted">{result.analysis.disclaimer}</p>
            <Link href={`/asset/${encodeURIComponent(result.symbol)}`} className="text-primary text-sm">Ver ficha</Link>
          </div>
        ) : null}
      </main>
    </div>
  );
}
