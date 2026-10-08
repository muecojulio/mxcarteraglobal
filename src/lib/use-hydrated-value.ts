"use client";

import { useRef, useState, useSyncExternalStore } from "react";

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

/**
 * `false` durante el SSR y la hidratación, `true` después.
 *
 * Sustituye el clásico `useState(false)` + `useEffect(() => setMounted(true))`,
 * que es otro setState síncrono dentro de un effect.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(noSubscribe, () => true, () => false);
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

/**
 * Como `useHydratedValue`, pero editable: devuelve `[valor, setValor]`.
 *
 * El valor es la edición local si la hay, y si no el dato del dispositivo. Así
 * se puede hidratar sin setState dentro de un effect y a la vez dejar que el
 * usuario modifique el campo. Escribir en el almacenamiento sigue siendo
 * responsabilidad de quien llama (igual que antes).
 *
 * `??` y no `||`: una edición a `false` o `""` debe ganar sobre el valor
 * hidratado.
 */
export function useHydratedState<T>(
  readIdentity: () => string,
  compute: () => T,
  serverValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const hydrated = useHydratedValue<T>(readIdentity, compute, serverValue);
  const [override, setOverride] = useState<T | null>(null);
  const value = override ?? hydrated;

  // Acepta valor o función, como setState. La función recibe el valor vigente
  // (edición local o hidratado), no el override en crudo.
  const set = (next: T | ((prev: T) => T)) => {
    setOverride(typeof next === "function" ? (next as (prev: T) => T)(value) : next);
  };

  return [value, set];
}
