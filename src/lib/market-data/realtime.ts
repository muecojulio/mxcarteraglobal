"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Quote } from "./types";
type Tick = { symbol: string; price: number; timestamp: number };
export function useRealtimeTicks(symbols: string[]) {
  const [ticks, setTicks] = useState<Record<string, Tick>>({});
  const [status, setStatus] = useState<"idle" | "connecting" | "live" | "error" | "off">("idle");
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const key = symbols.map((s) => s.toUpperCase()).filter((s) => s && !s.includes(".") && !s.endsWith(".MX")).filter((s, i, a) => a.indexOf(s) === i).slice(0, 25).join(",");
  const disconnect = useCallback(() => { if (wsRef.current) { try { wsRef.current.close(); } catch { /* */ } wsRef.current = null; } }, []);
  useEffect(() => {
    if (!key) { disconnect(); return; }
    let cancelled = false;
    const connect = async () => {
      setStatus("connecting"); setError(null);
      try {
        const res = await fetch("/api/realtime/token");
        if (!res.ok) { setStatus("off"); return; }
        const { token } = await res.json();
        if (!token || cancelled) { setStatus("off"); return; }
        const ws = new WebSocket(`wss://ws.finnhub.io?token=${token}`);
        wsRef.current = ws;
        ws.onopen = () => { setStatus("live"); key.split(",").forEach((s) => ws.send(JSON.stringify({ type: "subscribe", symbol: s }))); };
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data as string);
            if (msg.type === "trade" && Array.isArray(msg.data)) {
              setTicks((prev) => {
                const next = { ...prev };
                for (const t of msg.data) { if (t.s && t.p) next[String(t.s).toUpperCase()] = { symbol: String(t.s).toUpperCase(), price: Number(t.p), timestamp: Number(t.t) || Date.now() }; }
                return next;
              });
            }
          } catch { /* */ }
        };
        ws.onerror = () => { setStatus("error"); setError("WS"); };
        ws.onclose = () => { if (!cancelled) setStatus("off"); };
      } catch { if (!cancelled) setStatus("off"); }
    };
    void connect();
    return () => { cancelled = true; disconnect(); };
  }, [key, disconnect]);
  return { ticks, status, error };
}
export function mergeQuotesWithTicks(quotes: Quote[], ticks: Record<string, Tick>): Quote[] {
  return quotes.map((q) => {
    const t = ticks[q.symbol.toUpperCase()];
    if (!t) return q;
    const change = t.price - (q.previousClose ?? q.price);
    const changePercent = q.previousClose ? (change / q.previousClose) * 100 : q.changePercent;
    return { ...q, price: t.price, change, changePercent, updatedAt: new Date(t.timestamp).toISOString(), source: `${q.source}+ws` };
  });
}
