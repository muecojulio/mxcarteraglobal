"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePageVisible, isPageVisibleNow } from "@/lib/use-page-visible";
import type { Quote, SearchResult, IndexQuote } from "./types";
import { useRealtimeTicks, mergeQuotesWithTicks } from "./realtime";
import { cacheGet, cacheSet, cacheGetStale, CACHE_TTL } from "@/lib/local-cache";

type QuotesResponse = {
  quotes: Quote[];
  count: number;
  usingRealData: boolean;
  provider: string;
};

type SearchResponse = {
  results: SearchResult[];
  count: number;
  usingRealData: boolean;
  provider: string;
};

type IndicesResponse = {
  indices: IndexQuote[];
  count: number;
  usingRealData: boolean;
  provider: string;
};

type DividendItem = {
  date: string;
  amount: number;
  paymentDate?: string;
  recordDate?: string;
  declarationDate?: string;
  frequency?: string;
  currency: string;
  exDate?: string;
  type?: string;
};

type DividendsResponse = {
  symbol: string;
  region: string;
  dividends: DividendItem[];
  count: number;
  usingRealData: boolean;
  source: string;
};

export function useQuotes(
  symbols: string[],
  refreshMs = 60_000,
  opts?: { realtime?: boolean }
) {
  const [data, setData] = useState<QuotesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const realtime = opts?.realtime !== false; // por defecto ON

  const key = symbols.join(",");

  const pageVisible = usePageVisible();

  const cacheKey = key ? `quotes:${key}` : "quotes:empty";

  const fetchQuotes = useCallback(async (opts?: { force?: boolean }) => {
    if (!isPageVisibleNow()) return;
    if (symbols.length === 0) {
      setData({ quotes: [], count: 0, usingRealData: false, provider: "none" });
      setLoading(false);
      return;
    }
    if (!opts?.force) {
      const hit = cacheGet<QuotesResponse>(cacheKey);
      if (hit) {
        setData(hit);
        setLoading(false);
        return;
      }
    }
    try {
      setError(null);
      const res = await fetch(
        `/api/quotes?symbols=${encodeURIComponent(key)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as QuotesResponse;
      setData(json);
      cacheSet(cacheKey, json, Math.min(refreshMs || CACHE_TTL.quotes, CACHE_TTL.quotes));
    } catch (err) {
      const stale = cacheGetStale<QuotesResponse>(cacheKey);
      if (stale) setData(stale);
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }, [key, symbols.length, cacheKey, refreshMs]);

  useEffect(() => {
    if (!pageVisible) return;
    const hit = cacheGet<QuotesResponse>(cacheKey);
    if (hit) {
      setData(hit);
      setLoading(false);
    } else {
      setLoading(true);
    }
    fetchQuotes();
    if (refreshMs > 0) {
      const id = setInterval(() => {
        if (isPageVisibleNow()) fetchQuotes({ force: true });
      }, refreshMs);
      return () => clearInterval(id);
    }
  }, [fetchQuotes, refreshMs, pageVisible, cacheKey]);

  // WebSocket solo en primer plano
  const { ticks, status: wsStatus } = useRealtimeTicks(
    realtime && pageVisible ? symbols : []
  );

  const merged = useMemo(() => {
    if (!data) return null;
    if (!realtime || wsStatus !== "live") return data;
    const quotes = mergeQuotesWithTicks(data.quotes, ticks);
    return {
      ...data,
      quotes,
      provider:
        wsStatus === "live" ? `${data.provider}+websocket` : data.provider,
    };
  }, [data, ticks, wsStatus, realtime]);

  return {
    data: merged,
    loading,
    error,
    refresh: () => fetchQuotes({ force: true }),
    wsStatus: realtime ? wsStatus : ("off" as const),
  };
}

export function useSymbolSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    const qKey = `search:${query.trim().toLowerCase()}`;
    const hit = cacheGet<SearchResult[]>(qKey);
    if (hit) {
      setResults(hit);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query.trim())}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as SearchResponse;
      setResults(json.results);
      cacheSet(qKey, json.results, CACHE_TTL.search);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de búsqueda");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, search };
}

export function useIndices(refreshMs = 60_000) {
  const [data, setData] = useState<IndicesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIndices = useCallback(async (opts?: { force?: boolean }) => {
    if (!opts?.force) {
      const hit = cacheGet<IndicesResponse>("indices:all");
      if (hit) {
        setData(hit);
        setLoading(false);
        return;
      }
    }
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
    } finally {
      setLoading(false);
    }
  }, []);

  const pageVisible = usePageVisible();

  useEffect(() => {
    if (!pageVisible) return;
    setLoading(true);
    fetchIndices();
    if (refreshMs > 0) {
      const id = setInterval(() => {
        if (isPageVisibleNow()) fetchIndices();
      }, refreshMs);
      return () => clearInterval(id);
    }
  }, [fetchIndices, refreshMs, pageVisible]);

  return { data, loading, error, refresh: () => fetchIndices({ force: true }) };
}

export function useDividends(symbol: string | null) {
  const [data, setData] = useState<DividendsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const dKey = `div:${symbol}`;
    const hit = cacheGet<DividendsResponse>(dKey);
    if (hit) {
      setData(hit);
      setLoading(false);
      return;
    }
    fetch(`/api/dividends?symbol=${encodeURIComponent(symbol)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<DividendsResponse>;
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          cacheSet(dKey, json, CACHE_TTL.dividends);
        }
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return { data, loading, error };
}
