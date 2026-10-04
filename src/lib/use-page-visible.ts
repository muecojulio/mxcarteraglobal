"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  if (typeof document === "undefined") return () => undefined;
  const handleChange = () => onChange();
  document.addEventListener("visibilitychange", handleChange);
  window.addEventListener("focus", handleChange);
  window.addEventListener("blur", handleChange);
  window.addEventListener("pageshow", handleChange);
  return () => {
    document.removeEventListener("visibilitychange", handleChange);
    window.removeEventListener("focus", handleChange);
    window.removeEventListener("blur", handleChange);
    window.removeEventListener("pageshow", handleChange);
  };
}

export function usePageVisible(): boolean {
  return useSyncExternalStore(subscribe, isPageVisibleNow, () => true);
}

export function isPageVisibleNow(): boolean {
  if (typeof document === "undefined") return true;
  return document.visibilityState === "visible" && !document.hidden;
}
