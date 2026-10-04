"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type ToastCtx = { push: (msg: string) => void };
const Ctx = createContext<ToastCtx>({ push: () => undefined });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const push = useCallback((text: string) => {
    setMsg(text);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => { setMsg(null); timerRef.current = null; }, 2500);
  }, []);
  const value = useMemo(() => ({ push }), [push]);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  return (
    <Ctx.Provider value={value}>
      {children}
      {msg ? (
        <div className="fixed top-16 inset-x-0 z-[60] flex justify-center px-4 pointer-events-none">
          <div className="bg-card border border-border rounded-full px-4 py-2 text-sm shadow-lg" role="status" aria-live="polite" aria-atomic="true">
            {msg}
          </div>
        </div>
      ) : null}
    </Ctx.Provider>
  );
}

export function useToast() { return useContext(Ctx); }
