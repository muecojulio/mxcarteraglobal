"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { usePageVisible, isPageVisibleNow } from "@/lib/use-page-visible";
import type { Quote, SearchResult, IndexQuote } from "./types";
import { useRealtimeTicks, mergeQuotesWithTicks } from "./realtime";
import { cacheGet, cacheSet, cacheGetStale, CACHE_TTL } from "@/lib/local-cache";

type QuotesResponse = { quotes: Quote[]; count: number; usingRealData: boolean; provider: string };
type SearchResponse = { results: SearchResult[]; count: number; usingRealData: boolean; provider: string };
type IndicesResponse = { indices: IndexQuote[]; count: number; usingRealData: boolean; provider: string };
type DividendsResponse = { symbol: string; region: string; dividends: Array<{ date: string; amount: number; currency: string }>; count: number; usingRealData: boolean; source: string };

export function useQuotes(symbols: string[], refreshMs = 60_000, opts?: { realtime?: boolean }) {
  const [data, setData] = useState<QuotesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const realtime = opts?.realtime !== false;
  const key = symbols.join(",");
  const pageVisible = usePageVisible();
  const cacheKey = key ? `quotes:${key}` : "quotes:empty";
  const fetchQuotes = useCallback(async (o?: { force?: boolean }) => {
    if (!isPageVisibleNow()) return;
    if (symbols.length === 0) { setData({ quotes: [], count: 0, usingRealData: false, provider: "none" }); setLoading(false); return; }
    if (!o?.force) { const hit = cacheGet<QuotesResponse>(cacheKey); if (hit) { setData(hit); setLoading(false); return; } }
    try {
      setError(null);
      const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(key)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as QuotesResponse;
      setData(json);
      cacheSet(cacheKey, json, Math.min(refreshMs || CACHE_TTL.quotes, CACHE_TTL.quotes));
    } catch (err) {
      const stale = cacheGetStale<QuotesResponse>(cacheKey);
      if (stale) setData(stale);
      setError(err instanceof Error ? err.message : "Error de red");
    } finally { setLoading(false); }
  }, [key, symbols.length, cacheKey, refreshMs]);
  useEffect(() => {
    if (!pageVisible) return;
    let intervalId: number | null = null;
    const frame = window.requestAnimationFrame(() => {
      setLoading(true);
      void fetchQuotes();
      if (refreshMs > 0) {
        intervalId = window.setInterval(() => { if (isPageVisibleNow()) void fetchQuotes({ force: true }); }, refreshMs);
      }
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [fetchQuotes, refreshMs, pageVisible, cacheKey]);
  const { ticks, status: wsStatus } = useRealtimeTicks(realtime && pageVisible ? symbols : []);
  const merged = useMemo(() => {
    if (!data) return null;
    if (!realtime || wsStatus !== "live") return data;
    return { ...data, quotes: mergeQuotesWithTicks(data.quotes, ticks), provider: wsStatus === "live" ? `${data.provider}+websocket` : data.provider };
  }, [data, ticks, wsStatus, realtime]);
  return { data: merged, loading, error, refresh: () => fetchQuotes({ force: true }), wsStatus: realtime ? wsStatus : ("off" as const) };
}

export function useSymbolSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const search = useCallback(async (query: string) => {
    const id = ++requestId.current;
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const qKey = `search:${normalizedQuery.toLowerCase()}`;
    const hit = cacheGet<SearchResult[]>(qKey);
    if (hit) {
      if (id === requestId.current) { setResults(hit); setLoading(false); }
      return;
    }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(normalizedQuery)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as SearchResponse;
      cacheSet(qKey, json.results, CACHE_TTL.search);
      if (id === requestId.current) setResults(json.results);
    } catch (err) {
      if (id === requestId.current) {
        setError(err instanceof Error ? err.message : "Error de búsqueda");
        setResults([]);
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);
  return { results, loading, error, search };
}

export function useIndices(refreshMs = 60_000) {
  const [data, setData] = useState<IndicesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchIndices = useCallback(async (o?: { force?: boolean }) => {
    if (!o?.force) { const hit = cacheGet<IndicesResponse>("indices:all"); if (hit) { setData(hit); setLoading(false); return; } }
    try {
      setError(null);
      const res = await fetch("/api/indices");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as IndicesResponse;
      setData(json);
      cacheSet("indices:all", json, CACHE_TTL.indices);
    } catch (err) {
      const stale = cacheGetStale<IndicesResponse>("indices:all");
      if (stale) setData(stale);
      setError(err instanceof Error ? err.message : "Error de red");
    } finally { setLoading(false); }
  }, []);
  const pageVisible = usePageVisible();
  useEffect(() => {
    if (!pageVisible) return;
    let intervalId: number | null = null;
    const frame = window.requestAnimationFrame(() => {
      setLoading(true);
      void fetchIndices();
      if (refreshMs > 0) {
        intervalId = window.setInterval(() => { if (isPageVisibleNow()) void fetchIndices(); }, refreshMs);
      }
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [fetchIndices, refreshMs, pageVisible]);
  return { data, loading, error, refresh: () => fetchIndices({ force: true }) };
}

export function useDividends(symbol: string | null) {
  const [result, setResult] = useState<{ symbol: string; data: DividendsResponse | null; error: string | null } | null>(null);
  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    const dKey = `div:${symbol}`;
    const hit = cacheGet<DividendsResponse>(dKey);
    if (hit) {
      queueMicrotask(() => {
        if (!cancelled) setResult({ symbol, data: hit, error: null });
      });
      return () => { cancelled = true; };
    }
    fetch(`/api/dividends?symbol=${encodeURIComponent(symbol)}`)
      .then(async (res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json() as Promise<DividendsResponse>; })
      .then((json) => {
        if (!cancelled) {
          cacheSet(dKey, json, CACHE_TTL.dividends);
          setResult({ symbol, data: json, error: null });
        }
      })
      .catch((err) => {
        if (!cancelled) setResult({ symbol, data: null, error: err instanceof Error ? err.message : "Error" });
      });
    return () => { cancelled = true; };
  }, [symbol]);
  const current = symbol && result?.symbol === symbol ? result : null;
  return {
    data: current?.data ?? null,
    loading: !!symbol && !current,
    error: current?.error ?? null,
  };
}
