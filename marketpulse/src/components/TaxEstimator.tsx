"use client";

import { estimateDividendTax } from "@/lib/tax-mx";

export function TaxEstimator() {
  const r = estimateDividendTax({
    grossDividend: 100,
    assetKind: "us_stock",
    scenario: "w8ben",
  });
  return (
    <div className="bg-card border border-border rounded-xl p-3 text-sm space-y-1">
      <p className="font-medium">Estimador fiscal (educativo)</p>
      <p className="text-xs text-muted">
        Sobre 100 USD de dividendo US con W-8BEN: neto ≈ {r.netApprox.toFixed(2)} USD.
        No es asesoría.
      </p>
    </div>
  );
}
