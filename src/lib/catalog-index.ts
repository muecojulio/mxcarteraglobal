import { normalizeSearchText } from "./search-text";

/**
 * Índice invertido de n-gramas para el catálogo en memoria.
 *
 * Antes, `searchSic()` y `searchMxUniverse()` recorrían el catálogo completo en
 * cada petición y volvían a normalizar cada nombre (`NFD` + regex + trim +
 * `toUpperCase`) en cada tecla escrita. Aquí la normalización se paga UNA vez al
 * construir el índice y las consultas intersectan listas de posting de trigramas.
 * Es el equivalente en memoria de un índice secundario de base de datos: el
 * catálogo es la única "tabla" de la app (no hay SQL en este repo).
 *
 * Equivalencia con el escaneo lineal, garantizada por construcción:
 * toda cadena que contiene a la aguja contiene también todos sus trigramas, así
 * que la intersección de postings es un SUPERconjunto de las coincidencias
 * reales y el `includes` final descarta los falsos positivos. El orden de salida
 * es el del catálogo original.
 *
 * Agujas de menos de NGRAM caracteres no generan trigramas; esas caen a un
 * escaneo completo, que sigue siendo barato porque los textos ya están
 * normalizados.
 */

const NGRAM = 3;

export type IndexableItem = { symbol: string; name: string };

export type CatalogIndex<T extends IndexableItem> = {
  readonly items: T[];
  /** Búsqueda OR sobre varias agujas. Conserva el orden del catálogo. */
  search: (needles: string[]) => T[];
  /** Pertenencia exacta de símbolo en O(1) (sustituye a `.some()` lineal). */
  hasSymbol: (normalizedSymbol: string) => boolean;
};

type Entry<T> = { item: T; haystacks: string[] };

function trigrams(text: string): string[] {
  if (text.length < NGRAM) return [];
  const out: string[] = [];
  for (let i = 0; i + NGRAM <= text.length; i += 1) {
    out.push(text.slice(i, i + NGRAM));
  }
  return out;
}

/**
 * @param items catálogo en orden de prioridad (el orden se conserva al buscar)
 * @param extraHaystacks textos adicionales buscables por ítem (p. ej. símbolo sin `.MX`)
 */
export function buildCatalogIndex<T extends IndexableItem>(
  items: T[],
  extraHaystacks?: (item: T) => string[]
): CatalogIndex<T> {
  const entries: Entry<T>[] = items.map((item) => {
    const raw = [item.symbol.toUpperCase(), normalizeSearchText(item.name)];
    if (extraHaystacks) raw.push(...extraHaystacks(item));
    // Deduplicado: evita indexar y filtrar el mismo texto varias veces.
    return { item, haystacks: [...new Set(raw.filter((h) => h.length > 0))] };
  });

  const postings = new Map<string, Set<number>>();
  for (let i = 0; i < entries.length; i += 1) {
    const grams = new Set<string>();
    for (const haystack of entries[i]!.haystacks) {
      for (const gram of trigrams(haystack)) grams.add(gram);
    }
    for (const gram of grams) {
      let set = postings.get(gram);
      if (!set) {
        set = new Set<number>();
        postings.set(gram, set);
      }
      set.add(i);
    }
  }

  const exactSymbols = new Set<string>(
    items.map((item) => item.symbol.toUpperCase())
  );

  const search = (needles: string[]): T[] => {
    const valid = needles.filter((n) => n.length > 0);
    if (valid.length === 0) return [];

    const hit = new Uint8Array(entries.length);
    for (const needle of valid) {
      const grams = trigrams(needle);
      let candidates: number[];

      if (grams.length === 0) {
        // Aguja demasiado corta para el índice: escaneo completo.
        candidates = entries.map((_, i) => i);
      } else {
        const lists = grams.map((g) => postings.get(g));
        if (lists.some((l) => !l || l.size === 0)) {
          // Un trigrama ausente implica cero coincidencias para esta aguja.
          continue;
        }
        const sorted = (lists as Set<number>[]).slice().sort((a, b) => a.size - b.size);
        candidates = [...sorted[0]!].filter((i) =>
          sorted.every((l) => l.has(i))
        );
      }

      for (const i of candidates) {
        if (hit[i]) continue;
        if (entries[i]!.haystacks.some((h) => h.includes(needle))) hit[i] = 1;
      }
    }

    const out: T[] = [];
    for (let i = 0; i < entries.length; i += 1) {
      if (hit[i]) out.push(entries[i]!.item);
    }
    return out;
  };

  return {
    items,
    search,
    hasSymbol: (normalizedSymbol: string) => exactSymbols.has(normalizedSymbol),
  };
}

/** Memoiza un índice por clave para no reconstruirlo en cada petición. */
export function createIndexRegistry<T extends IndexableItem>() {
  const cache = new Map<string, CatalogIndex<T>>();
  return {
    get(key: string, build: () => CatalogIndex<T>): CatalogIndex<T> {
      let idx = cache.get(key);
      if (!idx) {
        idx = build();
        cache.set(key, idx);
      }
      return idx;
    },
    get size(): number {
      return cache.size;
    },
    clear(): void {
      cache.clear();
    },
  };
}

