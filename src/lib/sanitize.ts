/** Evita símbolos basura en query params (XSS / path raro). */

const SAFE = /^[A-Za-z0-9._^=-]{1,24}$/;

export function sanitizeSymbol(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!SAFE.test(s)) return null;
  return s;
}

export function sanitizeSymbolList(
  raw: string | null | undefined,
  max = 40
): string[] {
  if (!raw) return [];
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const s = sanitizeSymbol(part);
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= max) break;
  }
  return out;
}
