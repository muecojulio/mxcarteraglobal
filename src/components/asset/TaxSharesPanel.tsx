"use client";
import { useState } from "react";
import { toMxn, formatMxn } from "@/lib/fx";
import { estimateDividendTax, detectTaxAssetKind } from "@/lib/tax-mx";
export function TaxSharesPanel({
  symbol, assetType, lastDivAmount, divCurrency, price, priceCurrency, divYieldPct, usdMxn,
}: { symbol: string; assetType?: string; lastDivAmount?: number | null; divCurrency?: string; price?: number | null; priceCurrency?: string; divYieldPct?: number | null; usdMxn: number | null }) {
  const [shares, setShares] = useState(10);
  const kind = detectTaxAssetKind(symbol, assetType);
  let perShare = lastDivAmount != null && lastDivAmount > 0 ? lastDivAmount : null;
  if (perShare == null && price != null && price > 0 && divYieldPct != null && divYieldPct > 0) perShare = (price * (divYieldPct / 100)) / 4;
  const fromCur = divCurrency || priceCurrency || (kind === "mx_stock" || kind === "fibra" ? "MXN" : "USD");
  const grossNative = perShare != null ? perShare * Math.max(0, shares) : null;
  const grossMxn = grossNative != null ? toMxn(grossNative, fromCur, usdMxn) : null;
  const with8 = grossMxn != null ? estimateDividendTax({ grossDividend: grossMxn, assetKind: kind, scenario: "w8ben" }) : null;
  const no8 = grossMxn != null ? estimateDividendTax({ grossDividend: grossMxn, assetKind: kind, scenario: "no_w8ben" }) : null;
  return (
    <section className="bg-card rounded-xl border border-border p-4 mb-4">
      <h2 className="text-sm font-semibold mb-2">Impuestos (MX · orientativo)</h2>
      <p className="text-xs text-muted mb-3">Cálculo sobre acciones enteras que indiques.</p>
      <input className="ui-input" type="number" min={1} value={shares} onChange={(e) => setShares(Number(e.target.value) || 0)} />
      {with8 ? <p className="text-sm mt-2">Con W-8BEN neto ≈ {formatMxn(with8.netApprox)}</p> : null}
      {no8 ? <p className="text-xs text-muted">Sin W-8BEN neto ≈ {formatMxn(no8.netApprox)}</p> : null}
      <p className="text-[11px] text-muted mt-2">Solo fines educativos. No es asesoría fiscal.</p>
    </section>
  );
}
