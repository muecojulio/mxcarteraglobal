"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type ToastItem = { id: number; message: string };

const ToastCtx = createContext<(msg: string) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev.slice(-2), { id, message }]);
  }, []);

  useEffect(() => {
    if (!items.length) return;
    const t = setTimeout(() => {
      setItems((prev) => prev.slice(1));
    }, 2400);
    return () => clearTimeout(t);
  }, [items]);

  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div
        className="fixed left-0 right-0 z-[70] flex flex-col items-center gap-2 pointer-events-none px-4"
        style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))" }}
        aria-live="polite"
      >
        {items.map((it) => (
          <div
            key={it.id}
            className="pointer-events-auto max-w-sm w-full rounded-2xl bg-foreground text-background text-sm font-medium px-4 py-3 shadow-lg text-center"
          >
            {it.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
