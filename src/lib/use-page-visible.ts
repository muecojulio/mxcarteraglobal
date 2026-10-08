"use client";

import { useCallback, useSyncExternalStore } from "react";

/** true solo cuando la pestaña/app está en primer plano */
export function usePageVisible(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const onVis = () => onChange();
    // En móvil blur no siempre = segundo plano; visibility es más fiable, así
    // que focus/blur se dejan como disparadores y el snapshot decide el valor.
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    window.addEventListener("pageshow", onVis);
    window.addEventListener("blur", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
      window.removeEventListener("pageshow", onVis);
      window.removeEventListener("blur", onVis);
    };
  }, []);

  // useSyncExternalStore es la API de React para fuentes externas: lee durante
  // el render en vez de con useState + useEffect + setState, que provocaba un
  // render extra en cascada al montar. getServerSnapshot cubre el SSR.
  return useSyncExternalStore(subscribe, isPageVisibleNow, () => true);
}

export function isPageVisibleNow(): boolean {
  if (typeof document === "undefined") return true;
  return document.visibilityState === "visible" && !document.hidden;
}
