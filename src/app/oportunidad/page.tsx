"use client";

import { useState } from "react";
import Link from "next/link";
import { AssetSearch } from "@/components/AssetSearch";
import { useUsdMxn, toMxn, formatMxn } from "@/lib/fx";
import { detectAssetType } from "@/lib/market-data/types";

type Opportunity = {
  symbol: string;
  name: string;
  assetType: string;
  price: number;
  currency: string;
  changePercent: number;
  buyZoneLow: number;
  buyZoneHigh: number;
  idealBuy: number;
  signal: "comprar_zona" | "esperar" | "caro";
  label: string;
  reasons: string[];
  high52?: number | null;
  low52?: number | null;
  pe?: number | null;
  target?: number | null;
};

function computeOpportunity(data: {
  symbol: string;
  quote?: {
    price: number;
    changePercent: number;
    currency?: string;
    name?: string;
  } | null;
  profile?: { name?: string } | null;
  stats?: Record<string, number | null | undefined>;
  priceTarget?: { consensus?: number | null; median?: number | null } | null;
  assetType?: string;
}): Opportunity | null {
  const price = data.quote?.price;
  if (price == null || price <= 0) return null;

  const symbol = data.symbol;
  const name = data.profile?.name || data.quote?.name || symbol;
  const currency = data.quote?.currency || "USD";
  const changePercent = data.quote?.changePercent ?? 0;
  const high52 = data.stats?.high52 != null ? Number(data.stats.high52) : null;
  const low52 = data.stats?.low52 != null ? Number(data.stats.low52) : null;
  const pe = data.stats?.pe != null ? Number(data.stats.pe) : null;
  const target =
    data.priceTarget?.consensus ?? data.priceTarget?.median ?? null;

  const reasons: string[] = [];
  let idealBuy = price * 0.95; // base: ~5% bajo el precio actual
  let buyZoneLow = price * 0.9;
  let buyZoneHigh = price * 0.98;

  if (low52 != null && high52 != null && high52 > low52) {
    const range = high52 - low52;
    const pos = (price - low52) / range;
    // Zona de compra orientativa: tercio inferior del rango 52S
    buyZoneLow = low52;
    buyZoneHigh = low52 + range * 0.35;
    idealBuy = low52 + range * 0.2;
    reasons.push(
      `Rango 52 semanas: ${low52.toFixed(2)} – ${high52.toFixed(2)} (estás al ${(pos * 100).toFixed(0)}% del rango).`
    );
    if (pos > 0.75) {
      reasons.push("El precio está cerca de máximos de 52 semanas.");
    } else if (pos < 0.35) {
      reasons.push("El precio está en la zona baja del rango anual.");
    }
  } else {
    reasons.push(
      "Sin rango 52S completo: se usa un descuento orientativo sobre el precio actual."
    );
  }

  if (target != null && target > 0) {
    reasons.push(
      `Precio objetivo de analistas (consenso): ~${target.toFixed(2)}.`
    );
    // Si el target está por encima, ideal no debería estar por encima del precio actual de forma absurda
    if (target > price) {
      // comprar por debajo del midpoint entre precio y no más del ideal técnico
      idealBuy = Math.min(idealBuy, price * 0.97);
    } else {
      reasons.push("El consenso de analistas está por debajo del precio actual.");
      idealBuy = Math.min(idealBuy, target * 0.95);
      buyZoneHigh = Math.min(buyZoneHigh, target);
    }
  }

  if (pe != null && pe > 0) {
    if (pe > 40) {
      reasons.push(`PER elevado (~${pe.toFixed(1)}): conviene ser más exigente con el precio de entrada.`);
      idealBuy *= 0.97;
      buyZoneHigh *= 0.98;
    } else if (pe < 15) {
      reasons.push(`PER moderado (~${pe.toFixed(1)}).`);
    }
  }

  const assetType =
    data.assetType || detectAssetType(symbol);

  // Señal
  let signal: Opportunity["signal"] = "esperar";
  let label = "Fuera de la zona baja del rango (dato, no orden de compra)";
  if (price <= buyZoneHigh && price >= buyZoneLow * 0.98) {
    signal = "comprar_zona";
    label = "En el tercio bajo del rango 52 semanas (contexto, no recomendación)";
  } else if (price < buyZoneLow) {
    signal = "comprar_zona";
    label = "Por debajo del mínimo reciente del rango (revisar riesgos; no es señal de compra)";
  } else if (high52 && price > high52 * 0.92) {
    signal = "caro";
    label = "Cerca de máximos recientes del rango anual";
  } else if (price > buyZoneHigh) {
    signal = "esperar";
    label = "Por encima del tercio bajo del rango anual";
  }

  // Asegurar orden lógico
  if (buyZoneLow > buyZoneHigh) {
    const m = (buyZoneLow + buyZoneHigh) / 2;
    buyZoneLow = m * 0.95;
    buyZoneHigh = m * 1.02;
  }
  idealBuy = Math.min(Math.max(idealBuy, buyZoneLow), buyZoneHigh);

  return {
    symbol,
    name,
    assetType,
    price,
    currency,
    changePercent,
    buyZoneLow,
    buyZoneHigh,
    idealBuy,
    signal,
    label,
    reasons,
    high52,
    low52,
    pe,
    target,
  };
}

const SUGGESTIONS = [
  "AAPL",
  "MSFT",
  "DIV",
  "SCHD",
  "LQD",
  "HYG",
  "FUNO11.MX",
  "FIBRAPL14.MX",
  "AMXL.MX",
];

export default function OportunidadPage() {
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const { fx } = useUsdMxn(120_000);
  const usdMxn = fx?.usdMxn ?? null;

  const mx = (n: number, cur: string) =>
    formatMxn(toMxn(n, cur || "USD", usdMxn));

  const run = async (sym?: string) => {
    const s = (sym || symbol).trim().toUpperCase();
    if (!s) return;
    setSymbol(s);
    setLoading(true);
    setError(null);
    setOpp(null);
    try {
      const res = await fetch(
        `/api/asset?symbol=${encodeURIComponent(s)}&range=1y`
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const computed = computeOpportunity({
        symbol: data.symbol || s,
        quote: data.quote,
        profile: data.profile,
        stats: data.stats,
        priceTarget: data.priceTarget,
        assetType: data.assetType,
      });
      if (!computed) throw new Error("No hay precio en vivo para este símbolo");
      setOpp(computed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto">
          <h1 className="text-lg font-bold">Contexto de precio</h1>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 pb-10 pt-3">
        <p className="text-xs text-muted mb-3 leading-relaxed">
          Compara el precio en vivo con el rango de 52 semanas (MXN). Es un
          <span className="font-medium text-foreground"> contexto numérico</span>, no una orden de compra.
          MX Cartera Global no es casa de bolsa ni asesor autorizado.
        </p>

        <AssetSearch
          placeholder="Buscar ticker o nombre…"
          onSelect={(sym) => run(sym)}
        />

        <div className="flex gap-2 mt-3 mb-2">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="Ej. AAPL, LQD, FUNO11.MX"
            className="flex-1 bg-card border border-border rounded-xl py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="button"
            onClick={() => run()}
            disabled={loading}
            className="px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 min-h-[44px]"
          >
            {loading ? "…" : "Analizar"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
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

        {opp && !loading && (
          <div className="space-y-4">
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-bold text-lg">{opp.symbol}</p>
                  <p className="text-sm text-muted">{opp.name}</p>
                  <p className="text-[10px] text-primary font-medium uppercase mt-1">
                    {opp.assetType === "fibra"
                      ? "FIBRA"
                      : opp.assetType === "etf"
                      ? "ETF"
                      : "Acción / instrumento"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-lg">{mx(opp.price, opp.currency)}</p>
                  <p
                    className={`text-xs font-medium ${
                      opp.changePercent >= 0 ? "text-success" : "text-danger"
                    }`}
                  >
                    {opp.changePercent >= 0 ? "+" : ""}
                    {opp.changePercent.toFixed(2)}% hoy
                  </p>
                  <p className="text-[10px] text-muted">Precio en vivo</p>
                </div>
              </div>
            </div>

            <div
              className={`rounded-2xl border p-4 ${
                opp.signal === "comprar_zona"
                  ? "bg-success/10 border-success/30"
                  : opp.signal === "caro"
                  ? "bg-danger/10 border-danger/30"
                  : "bg-amber-500/10 border-amber-500/30"
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted mb-1">
                Señal orientativa
              </p>
              <p className="text-base font-bold mb-3">{opp.label}</p>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted">Comprar cerca de</span>
                  <span className="font-bold text-primary">
                    {mx(opp.idealBuy, opp.currency)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted">Zona de compra</span>
                  <span className="font-semibold">
                    {mx(opp.buyZoneLow, opp.currency)} –{" "}
                    {mx(opp.buyZoneHigh, opp.currency)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted">Precio actual</span>
                  <span className="font-medium">{mx(opp.price, opp.currency)}</span>
                </div>
              </div>
            </div>

            <section className="bg-card rounded-xl border border-border p-4">
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                Por qué
              </h2>
              <ul className="space-y-2">
                {opp.reasons.map((r, i) => (
                  <li key={i} className="text-sm flex gap-2 leading-relaxed">
                    <span className="text-primary">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </section>

            <Link
              href={`/asset/${encodeURIComponent(opp.symbol)}`}
              className="block text-center text-sm text-primary font-medium py-2"
            >
              Ver ficha completa →
            </Link>

            <p className="text-[11px] text-muted text-center leading-relaxed">
              Cálculo automático con precio en vivo, rango 52 semanas y, si hay,
              precio objetivo de analistas. No garantiza resultados ni sustituye
              tu criterio o el de un asesor.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
