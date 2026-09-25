"use client";
export function PortfolioEvents({ symbols }: { symbols?: string[] }) {
  if (!symbols?.length) return null;
  return <p className="text-xs text-muted">Eventos de {symbols.length} posición{symbols.length === 1 ? "" : "es"} en cartera.</p>;
}
