"use client";

import { useMemo, useState } from "react";
import {
  estimateDividendTax,
  detectTaxAssetKind,
  type TaxScenario,
} from "@/lib/tax-mx";

type Holding = {
  symbol: string;
  annualDividendIncome?: number;
  assetType?: string;
  region?: string;
};

export function TaxEstimator({
  holdings = [],
  annualDividendTotal,
}: {
  holdings?: Holding[];
  annualDividendTotal?: number;
}) {
  const [hasW8, setHasW8] = useState(true);

  const active: TaxScenario = hasW8 ? "w8ben" : "no_w8ben";

  const breakdown = useMemo(() => {
    if (holdings.length) {
      return holdings.map((h) => {
        const gross = h.annualDividendIncome || 0;
        const kind = detectTaxAssetKind(h.symbol, h.assetType);
        const est = estimateDividendTax({
          grossDividend: gross,
          assetKind: kind,
          scenario: kind.startsWith("us") ? active : "w8ben",
        });
        return { symbol: h.symbol, kind, ...est };
      });
    }
    if (annualDividendTotal && annualDividendTotal > 0) {
      const half = annualDividendTotal / 2;
      const us = estimateDividendTax({
        grossDividend: half,
        assetKind: "us_stock",
        scenario: active,
      });
      const mx = estimateDividendTax({
        grossDividend: half,
        assetKind: "mx_stock",
        scenario: active,
      });
      return [
        { symbol: "US (estimado 50%)", kind: "us_stock" as const, ...us },
        { symbol: "MX (estimado 50%)", kind: "mx_stock" as const, ...mx },
      ];
    }
    return [];
  }, [holdings, annualDividendTotal, active]);

  const totals = useMemo(() => {
    const gross = breakdown.reduce((s, x) => s + x.gross, 0);
    const usW = breakdown.reduce((s, x) => s + x.usWithholding, 0);
    const mxE = breakdown.reduce((s, x) => s + x.mxEstimate, 0);
    const net = breakdown.reduce((s, x) => s + x.netApprox, 0);
    return { gross, usW, mxE, net };
  }, [breakdown]);

  const fmt = (n: number) =>
    n.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    });

  return (
    <section className="bg-card rounded-xl border border-border p-4 space-y-3">
      <h2 className="text-sm font-semibold">Impuestos (orientativo · México)</h2>
      <p className="text-[11px] text-muted leading-relaxed">
        Residente fiscal en México. Compara retención US con y sin W-8BEN, y
        estimaciones para acciones MX y FIBRAs.{" "}
        <strong className="text-foreground">No es asesoría fiscal.</strong>
      </p>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={hasW8}
          onChange={(e) => setHasW8(e.target.checked)}
        />
        Tengo W-8BEN activo en el broker (tratado US)
      </label>

      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <div
          className={`rounded-lg border p-2 ${
            hasW8 ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <p className="font-bold text-sm">Con W-8BEN</p>
          <p className="text-muted">Retención US ~10%</p>
        </div>
        <div
          className={`rounded-lg border p-2 ${
            !hasW8 ? "border-red-500/50 bg-red-500/5" : "border-border"
          }`}
        >
          <p className="font-bold text-sm">Sin W-8BEN</p>
          <p className="text-muted">Retención US ~30%</p>
        </div>
      </div>

      {totals.gross > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-background border border-border p-2">
              <p className="text-sm font-bold">{fmt(totals.gross)}</p>
              <p className="text-[10px] text-muted">Bruto div. / año</p>
            </div>
            <div className="rounded-lg bg-background border border-border p-2">
              <p className="text-sm font-bold">{fmt(totals.net)}</p>
              <p className="text-[10px] text-muted">Neto aprox.</p>
            </div>
            <div className="rounded-lg bg-background border border-border p-2">
              <p className="text-sm font-bold text-red-500">−{fmt(totals.usW)}</p>
              <p className="text-[10px] text-muted">Retención US</p>
            </div>
            <div className="rounded-lg bg-background border border-border p-2">
              <p className="text-sm font-bold text-red-500">−{fmt(totals.mxE)}</p>
              <p className="text-[10px] text-muted">ISR MX orientativo</p>
            </div>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {breakdown
              .filter((b) => b.gross > 0)
              .map((b) => (
                <div
                  key={b.symbol}
                  className="flex justify-between text-xs border-b border-border/50 py-1"
                >
                  <span className="font-medium truncate">{b.symbol}</span>
                  <span className="text-muted shrink-0">
                    {fmt(b.gross)} → {fmt(b.netApprox)}
                  </span>
                </div>
              ))}
          </div>
        </>
      ) : (
        <p className="text-xs text-muted">
          Usa el total de dividendos de tu cartera (Análisis de dividendos) o
          desglose por posición para ver el impacto del W-8BEN.
        </p>
      )}

      <div className="text-[10px] text-muted space-y-1 leading-relaxed">
        <p>• Acciones/ETF US: diferencia principal 10% vs 30% en origen.</p>
        <p>
          • Acciones MX: ISR / retención local según régimen (cifra ilustrativa).
        </p>
        <p>
          • FIBRAs: parte puede ser capital o resultado fiscal; revisa constancia
          del fiduciario/broker.
        </p>
        <p>• Plusvalías al vender: no incluidas en este estimador.</p>
      </div>
    </section>
  );
}
