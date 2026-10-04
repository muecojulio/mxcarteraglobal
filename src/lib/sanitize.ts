const SYMBOL_SAFE = /^[A-Za-z0-9._^=-]{1,24}$/;
const QUERY_SAFE = /^[\p{L}\p{N} ._\-^=&/()]{0,80}$/u;

export function sanitizeSymbol(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!SYMBOL_SAFE.test(s)) return null;
  return s;
}

export function sanitizeSymbolList(raw: string | null | undefined, max = 40): string[] {
  if (!raw) return [];
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const s = sanitizeSymbol(part);
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

export function sanitizeSearchQuery(raw: string | null | undefined, maxLength = 80): string {
  if (!raw) return "";
  const q = raw.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
  if (!QUERY_SAFE.test(q)) return "";
  return q;
}

export function sanitizeRange(raw: string | null | undefined, allowed: readonly string[], fallback: string): string {
  const value = raw?.trim().toLowerCase();
  return value && allowed.includes(value) ? value : fallback;
}
