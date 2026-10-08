"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePageVisible, isPageVisibleNow } from "@/lib/use-page-visible";
import type { Quote, SearchResult, IndexQuote } from "./types";
import type { LiveStatus } from "./live-status";
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
  opts?: { autoRefresh?: boolean }
) {
  const [data, setData] = useState<QuotesResponse | null>(null);
  // `loading` se deriva de para qué clave terminó la carga, en vez de
  // setearse en síncrono dentro del effect.
  const [settledFor, setSettledFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoRefresh = opts?.autoRefresh !== false; // por defecto ON

  const key = symbols.join(",");

  const pageVisible = usePageVisible();

  const cacheKey = key ? `quotes:${key}` : "quotes:empty";
  const loading = settledFor !== cacheKey;

  const fetchQuotes = useCallback(async (opts?: { force?: boolean }) => {
    if (!isPageVisibleNow()) return;
    if (symbols.length === 0) {
      setData({ quotes: [], count: 0, usingRealData: false, provider: "none" });
      setSettledFor(cacheKey);
      return;
    }
    if (!opts?.force) {
      const hit = cacheGet<QuotesResponse>(cacheKey);
      if (hit) {
        setData(hit);
        setSettledFor(cacheKey);
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
      setSettledFor(cacheKey);
    }
  }, [key, symbols.length, cacheKey, refreshMs]);

  useEffect(() => {
    if (!pageVisible) return;
    // Llamada inicial tras un await: nada síncrono en el cuerpo del effect.
    void (async () => {
      await fetchQuotes();
    })();
    if (refreshMs > 0) {
      const id = setInterval(() => {
        if (isPageVisibleNow()) fetchQuotes({ force: true });
      }, refreshMs);
      return () => clearInterval(id);
    }
  }, [fetchQuotes, refreshMs, pageVisible, cacheKey]);

  // Estado de frescura derivado: sin WebSocket, el refresco es el sondeo al
  // servidor (que es quien tiene la llave del proveedor). Si la pestaña está en
  // segundo plano no se refresca, para no gastar cuota.
  const liveStatus: LiveStatus = useMemo(() => {
    if (!autoRefresh || refreshMs <= 0 || symbols.length === 0) {
      return { mode: "off", intervalMs: refreshMs };
    }
    if (!pageVisible) return { mode: "paused", intervalMs: refreshMs };
    return { mode: "poll", intervalMs: refreshMs };
  }, [autoRefresh, refreshMs, pageVisible, symbols.length]);

  return {
    data,
    loading,
    error,
    refresh: () => fetchQuotes({ force: true }),
    liveStatus,
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
  // `loading` se deriva de si la carga ya terminó, en vez de setearse en
  // síncrono dentro del effect.
  const [settled, setSettled] = useState(false);
  const loading = !settled;
  const [error, setError] = useState<string | null>(null);

  const fetchIndices = useCallback(async (opts?: { force?: boolean }) => {
    if (!opts?.force) {
      const hit = cacheGet<IndicesResponse>("indices:all");
      if (hit) {
        setData(hit);
        setSettled(true);
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
      setSettled(true);
    }
  }, []);

  const pageVisible = usePageVisible();

  useEffect(() => {
    if (!pageVisible) return;
    void (async () => {
      await fetchIndices();
    })();
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
  const [dataRaw, setData] = useState<DividendsResponse | null>(null);
  // `loading` y `data` se derivan de para qué símbolo terminó la carga, en vez
  // de setearse en síncrono dentro del effect.
  const [settledFor, setSettledFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dKey = symbol ? `div:${symbol}` : null;
  const loading = dKey !== null && settledFor !== dKey;
  const data = dKey === null ? null : dataRaw;

  useEffect(() => {
    if (!symbol) return;
    const key = `div:${symbol}`;
    let cancelled = false;
    void (async () => {
      const hit = cacheGet<DividendsResponse>(key);
      if (hit) {
        setData(hit);
        setError(null);
        setSettledFor(key);
        return;
      }
      try {
        const res = await fetch(
          `/api/dividends?symbol=${encodeURIComponent(symbol)}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as DividendsResponse;
        if (cancelled) return;
        setData(json);
        cacheSet(key, json, CACHE_TTL.dividends);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Error");
      } finally {
        if (!cancelled) setSettledFor(key);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return { data, loading, error };
}
