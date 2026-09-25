"use client";
import { useEffect, useRef, useState, useCallback } from "react";
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
    if (!key) { disconnect(); setStatus("off"); return; }
    let cancelled = false;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const connect = async () => {
      setStatus("connecting"); setError(null);
      try {
        const res = await fetch("/api/realtime/token");
        if (!res.ok) { setStatus("off"); setError("WebSocket no configurado"); return; }
        const { token } = (await res.json()) as { token?: string };
        if (!token || cancelled) { setStatus("off"); return; }
        const ws = new WebSocket(`wss://ws.finnhub.io?token=${token}`);
        wsRef.current = ws;
        ws.onopen = () => {
          if (cancelled) { ws.close(); return; }
          setStatus("live");
          for (const s of key.split(",")) ws.send(JSON.stringify({ type: "subscribe", symbol: s }));
          pingTimer = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" })); }, 30000);
        };
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(String(ev.data));
            if (msg.type === "trade" && Array.isArray(msg.data)) {
              setTicks((prev) => {
                const next = { ...prev };
                for (const d of msg.data) {
                  if (d.s && d.p != null) next[String(d.s).toUpperCase()] = { symbol: String(d.s).toUpperCase(), price: Number(d.p), timestamp: Number(d.t) || Date.now() };
                }
                return next;
              });
            }
          } catch { /* */ }
        };
        ws.onerror = () => { setError("Error de WebSocket"); setStatus("error"); };
        ws.onclose = () => { setStatus("error"); if (!cancelled) reconnectTimer = setTimeout(connect, 4000); };
      } catch { if (!cancelled) { setStatus("error"); setError("No se pudo conectar"); } }
    };
    connect();
    return () => { cancelled = true; if (pingTimer) clearInterval(pingTimer); if (reconnectTimer) clearTimeout(reconnectTimer); disconnect(); };
  }, [key, disconnect]);
  return { ticks, status, error };
}
export function mergeQuotesWithTicks(quotes: Quote[] | undefined, ticks: Record<string, Tick>): Quote[] {
  if (!quotes?.length) return quotes || [];
  return quotes.map((q) => {
    const t = ticks[q.symbol.toUpperCase()];
    if (!t) return q;
    const prev = q.previousClose ?? q.price - (q.change || 0);
    const price = t.price;
    const change = price - prev;
    const changePercent = prev ? (change / prev) * 100 : q.changePercent;
    return { ...q, price, change, changePercent, updatedAt: new Date(t.timestamp).toISOString(), source: `${q.source}+ws` };
  });
}
