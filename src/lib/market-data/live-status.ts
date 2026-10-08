"use client";

/**
 * Estado de frescura de las cotizaciones.
 *
 * **Decisión de seguridad (2026-10-08):** aquí vivía un WebSocket directo a
 * Finnhub que obligaba a entregar `FINNHUB_API_KEY` al navegador
 * (`/api/realtime/token`). Una llave que el cliente necesita no se puede
 * esconder: cualquiera podía pedirla con `curl` y quemar la cuota (o provocar
 * que Finnhub la bloqueara). El WebSocket se retiró y la actualización en vivo
 * ahora sale del sondeo al servidor, que es quien habla con los proveedores y
 * guarda la llave.
 *
 * Para no perder de vista qué está pasando, las páginas muestran este estado:
 * - `poll`   → refresco automático cada `intervalMs`.
 * - `paused` → la pestaña está en segundo plano (no se gasta cuota).
 * - `off`    → el usuario desactivó el refresco o no hay símbolos.
 */
export type LiveMode = "poll" | "paused" | "off";

export type LiveStatus = {
  mode: LiveMode;
  intervalMs: number;
};

function formatSeconds(ms: number): string {
  const s = Math.max(1, Math.round(ms / 1000));
  return s >= 60 ? `${Math.round(s / 60)} min` : `${s} s`;
}

export function liveLabel(status: LiveStatus): string {
  switch (status.mode) {
    case "poll":
      return formatSeconds(status.intervalMs);
    case "paused":
      return "En pausa";
    default:
      return "Manual";
  }
}
