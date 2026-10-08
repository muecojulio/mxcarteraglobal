"use client";

import { useEffect } from "react";

export type ThemeMode = "system" | "light" | "dark";

const KEY = "marketpulse_theme";

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const v = localStorage.getItem(KEY);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (mode === "light") root.classList.add("light");
  else if (mode === "dark") root.classList.add("dark");
  // system: no class → CSS prefers-color-scheme
  localStorage.setItem(KEY, mode);
}

/** Aplica tema guardado al montar (evitar flash) */
export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    applyTheme(getStoredTheme());
  }, []);
  return <>{children}</>;
}
