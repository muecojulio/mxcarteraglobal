"use client";

import { useMemo } from "react";
import Link from "next/link";

export type RebalancePosition = {
  symbol: string;
  name?: string;
  marketValue: number;
  region?: string;
  currency?: string;
};

type Props = {
  positions: RebalancePosition[];
  /** Umbral de concentración por emisor (default 20%) */
  maxSinglePct?: number;
  displayCurrency?: string;
};

/**
 * Sugerencias de rebalanceo educativas:
 * - Concentración por emisor
 * - Balance MX vs US
 * - Hacia pesos más equitativos si hay sesgo fuerte
 */
export function RebalanceSuggestions({
  positions,
  maxSinglePct = 20,
  displayCurrency = "MXN",
}: Props) {
  const analysis = useMemo(() => {
    const total = positions.reduce((s, p) => s + (p.marketValue || 0), 0);
    if (!total || positions.length === 0) {
      return null;
    }

    const withPct = positions
      .map((p) => ({
        ...p,
        pct: ((p.marketValue || 0) / total) * 100,
      }))
      .sort((a, b) => b.pct - a.pct);

    const overweight = withPct.filter((p) => p.pct >= maxSinglePct);
    const mx = withPct
      .filter(
        (p) =>
          p.region === "MX" ||
          (p.symbol || "").toUpperCase().includes(".MX")
      )
      .reduce((s, p) => s + p.pct, 0);
    const us = 100 - mx;

    const equalWeight = 100 / withPct.length;
    const suggestions: string[] = [];

    if (overweight.length) {
      for (const o of overweight) {
        const excess = o.pct - maxSinglePct;
        suggestions.push(
          `${o.symbol} concentra ${o.pct.toFixed(1)}% (límite ${maxSinglePct}%). Considera reducir ~${excess.toFixed(1)} pp y diversificar.`
        );
      }
    }

    if (mx > 75) {
      suggestions.push(
        `Cartera muy expuesta a México (${mx.toFixed(0)}%). Valora añadir ETFs/acciones US para diversificar moneda y mercado.`
      );
    } else if (us > 75) {
      suggestions.push(
        `Cartera muy expuesta a EE.UU. (${us.toFixed(0)}%). Si operas en MXN, evalúa FIBRAs o emisoras locales para balance.`
      );
    }

    if (withPct.length >= 3) {
      const top = withPct[0];
      const bottom = withPct[withPct.length - 1];
      if (top.pct > equalWeight * 2.5 && bottom.pct < equalWeight * 0.4) {
        suggestions.push(
          `Sesgo fuerte: ${top.symbol} ${top.pct.toFixed(1)}% vs ${bottom.symbol} ${bottom.pct.toFixed(1)}%. Un peso más equilibrado sería ~${equalWeight.toFixed(1)}% por posición.`
        );
      }
    }

    if (!suggestions.length) {
      suggestions.push(
        "Concentración dentro de rangos razonables. Revisa metas de riesgo al menos cada trimestre."
      );
    }

    // Targets sugeridos (hacia max 20% o equal weight, el menor agresivo)
    const targets = withPct.map((p) => {
      let targetPct = Math.min(p.pct, maxSinglePct);
      if (p.pct > maxSinglePct) targetPct = maxSinglePct;
      return {
        symbol: p.symbol,
        currentPct: p.pct,
        targetPct,
        action:
          p.pct > maxSinglePct + 1
            ? ("reducir" as const)
            : p.pct < equalWeight * 0.5 && withPct.length >= 4
            ? ("aumentar" as const)
            : ("mantener" as const),
      };
    });

    // Renormalizar targets si se recortó overweight
    const sumT = targets.reduce((s, t) => s + t.targetPct, 0);
    const normalized = targets.map((t) => ({
      ...t,
      targetPct: sumT > 0 ? (t.targetPct / sumT) * 100 : t.targetPct,
    }));

    return {
      total,
      withPct,
      mx,
      us,
      equalWeight,
      suggestions,
      targets: normalized,
    };
  }, [positions, maxSinglePct]);

  if (!analysis) {
    return (
      <section className="bg-card rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold mb-2">Rebalanceo sugerido</h2>
        <p className="text-xs text-muted">
          Añade posiciones en Cartera para ver sugerencias.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-card rounded-xl border border-border p-4 space-y-3">
      <h2 className="text-sm font-semibold">Rebalanceo sugerido</h2>
      <p className="text-[11px] text-muted leading-relaxed">
        Orientativo (no es asesoría). Límite por emisor {maxSinglePct}% · pesos
        actuales en {displayCurrency}.
      </p>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-background border border-border p-2">
          <p className="text-lg font-bold">{analysis.mx.toFixed(0)}%</p>
          <p className="text-[10px] text-muted">México</p>
        </div>
        <div className="rounded-lg bg-background border border-border p-2">
          <p className="text-lg font-bold">{analysis.us.toFixed(0)}%</p>
          <p className="text-[10px] text-muted">EE.UU. / otro</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-muted">
          Concentración (top posiciones)
        </p>
        {analysis.withPct.slice(0, 5).map((p) => (
          <div key={p.symbol}>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="font-medium">{p.symbol}</span>
              <span
                className={
                  p.pct >= maxSinglePct
                    ? "text-danger font-semibold"
                    : "text-muted"
                }
              >
                {p.pct.toFixed(1)}%
                {p.pct >= maxSinglePct ? " · alto" : ""}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  p.pct >= maxSinglePct ? "bg-danger/80" : "bg-primary/70"
                }`}
                style={{ width: `${Math.min(100, p.pct)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <ul className="space-y-1.5">
        {analysis.suggestions.map((s, i) => (
          <li
            key={i}
            className="text-xs text-muted leading-relaxed border-l-2 border-primary/40 pl-2"
          >
            {s}
          </li>
        ))}
      </ul>

      <div className="space-y-1.5 pt-1">
        <p className="text-[11px] font-medium text-muted uppercase tracking-wide">
          Por posición
        </p>
        {analysis.targets.slice(0, 12).map((t) => (
          <div
            key={t.symbol}
            className="flex items-center justify-between text-sm gap-2"
          >
            <Link
              href={`/asset/${encodeURIComponent(t.symbol)}`}
              className="font-medium truncate"
            >
              {t.symbol}
            </Link>
            <div className="text-right shrink-0 text-xs">
              <span className="text-muted">
                {t.currentPct.toFixed(1)}% → {t.targetPct.toFixed(1)}%
              </span>
              <span
                className={`ml-2 font-medium ${
                  t.action === "reducir"
                    ? "text-danger"
                    : t.action === "aumentar"
                    ? "text-success"
                    : "text-muted"
                }`}
              >
                {t.action}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
