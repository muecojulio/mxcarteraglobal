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
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", () => setVisible(true));
    window.addEventListener("pageshow", onVis);
    window.addEventListener("blur", () => setVisible(read()));
    return () => {
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return visible;
}

export function isPageVisibleNow(): boolean {
  if (typeof document === "undefined") return true;
  return document.visibilityState === "visible" && !document.hidden;
}
