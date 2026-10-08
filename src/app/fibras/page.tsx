"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuotes } from "@/lib/market-data/client";
import { getFibraMeta } from "@/lib/fibra-meta";

const FIBRAS = [
  // FIBRAs México — BMV y BIVA (donde cotizan; símbolo Yahoo .MX)
  { symbol: "FUNO11.MX", name: "Fibra UNO" },
  { symbol: "FIBRAPL14.MX", name: "Fibra Prologis" },
  { symbol: "FMTY14.MX", name: "Fibra Mty" },
  { symbol: "DANHOS13.MX", name: "Fibra Danhos" },
  { symbol: "TERRA13.MX", name: "Fibra Terra" },
  { symbol: "FSHOP13.MX", name: "Fibra Shop" },
  { symbol: "FIHO12.MX", name: "Fibra Hotel" },
  { symbol: "FHIPO14.MX", name: "FHipo (Hipotecaria)" },
  { symbol: "FNOVA17.MX", name: "Fibra Nova" },
  { symbol: "STORAGE18.MX", name: "Fibra Storage" },
  { symbol: "EDUCA18.MX", name: "Fibra Educa" },
  { symbol: "FINN13.MX", name: "Fibra Inn" },
  { symbol: "FPLUS16.MX", name: "Fibra Plus" },
  { symbol: "FIBRAUP15.MX", name: "Fibra Upsite" },
  { symbol: "FCFE18.MX", name: "CFE Fibra E (FCFE18)" },
  { symbol: "FMX23.MX", name: "FMX23" },
  { symbol: "NEXT25.MX", name: "Fibra NEXT (NEXT25)" },
];

function fmt(n: number) {
  return n.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function FibrasPage() {
  const symbols = useMemo(() => FIBRAS.map((e) => e.symbol), []);
  const { data, loading, refresh } = useQuotes(symbols, 45_000);
  const map = useMemo(() => {
    const m = new Map<
      string,
      { price: number; changePercent: number; currency: string }
    >();
    (data?.quotes ?? []).forEach((q) =>
      m.set(q.symbol.toUpperCase(), {
        price: q.price,
        changePercent: q.changePercent,
        currency: q.currency,
      })
    );
    return m;
  }, [data]);

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border safe-top">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <h1 className="text-lg font-bold">FIBRAs</h1>
          <button
            type="button"
            onClick={() => refresh()}
            className="w-9 h-9 rounded-full border border-border text-muted text-sm"
          >
            ↻
          </button>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pb-10 pt-3">
        <p className="text-[11px] text-muted leading-relaxed px-4 mb-2">
          En cada ficha verás un desglose orientativo de{" "}
          <span className="text-foreground font-medium">resultado fiscal</span> y{" "}
          <span className="text-foreground font-medium">reembolso de capital</span>.
          El aviso oficial del fiduciario manda cada mes.
        </p>
        <p className="text-xs text-muted mb-3 leading-relaxed">
          FIBRAs de México listadas en BMV y/o BIVA. Misma ficha que acciones:
          precio en MXN, gráfico, dividendos, estadísticas, yield vs tasa libre
          de riesgo e impuestos orientativos. Si un ticker no cotiza ese día,
          verás “—” hasta que haya dato.
        </p>
        {loading && (
          <p className="text-xs text-muted mb-2">Actualizando precios…</p>
        )}
        <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
          {FIBRAS.map((e) => {
            const q = map.get(e.symbol.toUpperCase());
            return (
              <Link
                key={e.symbol}
                href={`/asset/${encodeURIComponent(e.symbol)}`}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm">{e.symbol}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      FIBRA
                    </span>
                  </div>
                  <p className="text-xs text-muted truncate">{e.name}</p>
                  <p className="text-[10px] text-muted truncate">
                    {getFibraMeta(e.symbol)?.propertyTypes.join(" · ") ||
                      "FIBRA"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm">
                    {q ? `${fmt(q.price)} MXN` : "—"}
                  </p>
                  {q && (
                    <p
                      className={`text-xs font-medium ${
                        q.changePercent >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {q.changePercent >= 0 ? "+" : ""}
                      {q.changePercent.toFixed(2)}%
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
