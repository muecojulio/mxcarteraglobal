"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Número que "cuenta" hasta su nuevo valor cuando éste cambia
 * (idea del componente `NumberTicker` de magicuidesign/magicui).
 *
 * - El primer render muestra el valor final tal cual (sin desfase de SSR).
 * - Los cambios posteriores animan con easing cúbico durante `duration` ms.
 * - Con `prefers-reduced-motion` el cambio es instantáneo.
 *
 * Sin `setState` en el cuerpo del effect (el ajuste de estado ocurre en fase
 * de render, patrón de estado derivado) y sin leer refs durante el render:
 * un effect de sincronización mantiene el ref con el último valor pintado.
 */
export function AnimatedNumber({
  value,
  format,
  duration = 650,
  className,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  if (prevValue !== value) {
    setPrevValue(value);
    const reduce =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Con reduced-motion salta directo al nuevo valor; sin él, `display`
    // conserva el número pintado y el effect anima desde ahí hasta `value`.
    if (reduce) setDisplay(value);
  }

  const frameRef = useRef(0);
  const displayRef = useRef(display);
  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    const from = displayRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  return <span className={className}>{format(display)}</span>;
}
