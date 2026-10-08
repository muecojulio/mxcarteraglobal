"use client";

import { useRef, useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * Hidrata un valor desde el almacenamiento del dispositivo **durante el render**,
 * en vez de con `useState` + `useEffect` + `setState`.
 *
 * Por qué existe: ese patrón de hidratación provoca un setState síncrono dentro
 * del effect, que es lo que marca `react-hooks/set-state-in-effect` y fuerza un
 * render extra en cascada al montar. `useSyncExternalStore` es la API de React
 * para fuentes externas: usa `getServerSnapshot` en el SSR y durante la
 * hidratación, y `getSnapshot` en el cliente, así que no hay desajuste.
 *
 * Restricción importante: `getSnapshot` debe devolver el MISMO valor entre
 * llamadas o React entra en bucle. Como leer y parsear crea objetos nuevos cada
 * vez, el resultado se cachea mientras la identidad de la fuente no cambie.
 *
 * @param readIdentity string que cambia cuando cambia la fuente (p. ej. el
 *   contenido crudo en localStorage). Debe ser barato y estable.
 * @param compute deriva el valor a partir de la fuente. Solo se ejecuta cuando
 *   cambió la identidad.
 * @param serverValue valor para el SSR. Pasa una constante de módulo, no un
 *   literal nuevo en cada render.
 */
export function useHydratedValue<T>(
  readIdentity: () => string,
  compute: () => T,
  serverValue: T
): T {
  const cache = useRef<{ id: string; value: T } | null>(null);

  const getSnapshot = () => {
    let id: string;
    try {
      id = readIdentity();
    } catch {
      id = "";
    }
    if (cache.current && cache.current.id === id) return cache.current.value;
    const value = compute();
    cache.current = { id, value };
    return value;
  };

  return useSyncExternalStore(noSubscribe, getSnapshot, () => serverValue);
}

/** Identidad basada en una clave de localStorage. */
export function localStorageIdentity(key: string): () => string {
  return () => {
    try {
      return localStorage.getItem(key) ?? "";
    } catch {
      return "";
    }
  };
}
