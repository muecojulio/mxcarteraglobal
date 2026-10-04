"use client";
import { createContext, useContext, useMemo, useState } from "react";
type ToastCtx = { push: (msg: string) => void };
const Ctx = createContext<ToastCtx>({ push: () => undefined });
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const value = useMemo(() => ({ push: (text: string) => { setMsg(text); window.setTimeout(() => setMsg(null), 2500); } }), []);
  return (
    <Ctx.Provider value={value}>
      {children}
      {msg ? <div className="fixed top-16 inset-x-0 z-[60] flex justify-center px-4"><div className="toast-pop bg-card border border-border rounded-full px-4 py-2 text-sm shadow-lg">{msg}</div></div> : null}
    </Ctx.Provider>
  );
}
export function useToast() { return useContext(Ctx); }
