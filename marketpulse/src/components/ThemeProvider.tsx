"use client";
export type ThemeMode = "system" | "light" | "dark";
export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const t = localStorage.getItem("marketpulse_theme");
  if (t === "light" || t === "dark" || t === "system") return t;
  return "system";
}
export function applyTheme(mode: ThemeMode) {
  const d = document.documentElement;
  d.classList.remove("light", "dark");
  localStorage.setItem("marketpulse_theme", mode);
  if (mode === "light") d.classList.add("light");
  else if (mode === "dark") d.classList.add("dark");
}
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
