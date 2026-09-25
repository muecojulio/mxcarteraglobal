"use client";

import { useEffect, useState } from "react";

export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const read = () => {
      if (typeof document === "undefined") return true;
      return document.visibilityState === "visible" && !document.hidden;
    };
    setVisible(read());
    const onVis = () => setVisible(read());
    const onFocus = () => setVisible(true);
    const onBlur = () => setVisible(read());
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onVis);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onVis);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return visible;
}

export function isPageVisibleNow(): boolean {
  if (typeof document === "undefined") return true;
  return document.visibilityState === "visible" && !document.hidden;
}
