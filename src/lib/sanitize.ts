import { normalizeYahooSymbol } from "./market-data/types";

/** Normaliza tickers de entrada sin admitir rutas ni caracteres ejecutables. */
const SAFE_INPUT = /^[A-Za-z0-9._^=\-\s]{1,32}$/;
const SAFE_SYMBOL = /^[A-Z0-9._^=\-]{1,24}$/;

export function sanitizeSymbol(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const input = raw.trim().toUpperCase();
  if (!SAFE_INPUT.test(input)) return null;
  const symbol = normalizeYahooSymbol(input);
  return SAFE_SYMBOL.test(symbol) ? symbol : null;
}

export function sanitizeSymbolList(
  raw: string | null | undefined,
  max = 40
): string[] {
  if (!raw) return [];
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const symbol = sanitizeSymbol(part);
    if (symbol && !out.includes(symbol)) out.push(symbol);
    if (out.length >= max) break;
  }
  return out;
}
