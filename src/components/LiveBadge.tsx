"use client";

import { liveLabel, type LiveStatus } from "@/lib/market-data/live-status";

/**
 * Etiqueta de frescura de los datos.
 *
 * Antes decía "EN VIVO" porque había un WebSocket con la llave de Finnhub en el
 * navegador. Esa ruta se retiró (la llave ya no sale del servidor), así que la
 * etiqueta ahora dice cada cuánto se refresca y en qué estado está.
 */
export function LiveBadge({ status }: { status?: LiveStatus }) {
  if (!status || status.mode === "off") return null;

  const label = liveLabel(status);
  const color =
    status.mode === "poll"
      ? "bg-success/15 text-success"
      : "bg-secondary text-muted";

  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${color}`}
      title={
        status.mode === "poll"
          ? `Se actualiza automáticamente cada ${label}`
          : "Actualización automática en pausa (pestaña en segundo plano)"
      }
    >
      {status.mode === "poll" ? (
        <span className="relative inline-flex w-1.5 h-1.5 mr-1.5 align-middle">
          <span className="ui-ping absolute inline-flex h-full w-full rounded-full bg-success" />
          <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-success" />
        </span>
      ) : null}
      {label}
    </span>
  );
}
