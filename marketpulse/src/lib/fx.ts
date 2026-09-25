"use client";
import { useEffect, useState } from "react";
import { usePageVisible, isPageVisibleNow } from "@/lib/use-page-visible";
import { cacheGet, cacheSet, cacheGetStale, CACHE_TTL } from "@/lib/local-cache";
export type FxRate = { usdMxn: number; mxnUsd: number; source: string; asOf: string | null };
export function useUsdMxn(refreshMs = 120_000) {
  const [fx, setFx] = useState<FxRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageVisible = usePageVisible();
  useEffect(() => {
    let cancelled = false;
    const load = async (force = false) => {
      if (!isPageVisibleNow()) return;
      if (!force) {
        const hit = cacheGet<FxRate>("fx:usdMxn");
        if (hit) { setFx(hit); setLoading(false); return; }
      }
      try {
        const res = await fetch("/api/fx");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.usdMxn == null) throw new Error(data.error || "Sin tipo de cambio");
        const rate: FxRate = { usdMxn: data.usdMxn, mxnUsd: data.mxnUsd, source: data.source, asOf: data.asOf };
        setFx(rate);
        cacheSet("fx:usdMxn", rate, CACHE_TTL.fx);
        setError(null);
      } catch (e) {
        const stale = cacheGetStale<FxRate>("fx:usdMxn");
        if (stale && !cancelled) setFx(stale);
        if (!cancelled) setError(e instanceof Error ? e.message : "Error FX");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (!pageVisible) return () => { cancelled = true; };
    void load(false);
    const id = setInterval(() => void load(), refreshMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [refreshMs, pageVisible]);
  return { fx, loading, error };
}
export function toDisplay(amount: number, fromCurrency: "USD" | "MXN" | string, display: "USD" | "MXN", usdMxn: number): number {
  const from = fromCurrency === "MXN" ? "MXN" : "USD";
  if (from === display) return amount;
  if (from === "USD" && display === "MXN") return amount * usdMxn;
  if (from === "MXN" && display === "USD") return amount / usdMxn;
  return amount;
}
export function toMxn(amount: number, fromCurrency: "USD" | "MXN" | string | undefined, usdMxn: number | null | undefined): number {
  if (amount == null || !Number.isFinite(amount)) return 0;
  const from = fromCurrency === "MXN" || fromCurrency === "mxn" ? "MXN" : "USD";
  if (from === "MXN") return amount;
  return amount * (usdMxn && usdMxn > 0 ? usdMxn : 17.5);
}
export function formatMxn(amount: number, digits = 2): string {
  return amount.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: digits, maximumFractionDigits: digits });
}
