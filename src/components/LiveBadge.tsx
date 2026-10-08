"use client";

export function LiveBadge({
  status,
}: {
  status?: "idle" | "connecting" | "live" | "error" | "off";
}) {
  if (!status || status === "off" || status === "idle") return null;
  const label =
    status === "live"
      ? "EN VIVO"
      : status === "connecting"
      ? "Conectando…"
      : "WS";
  const color =
    status === "live"
      ? "bg-success/15 text-success"
      : status === "connecting"
      ? "bg-secondary text-muted"
      : "bg-danger/15 text-danger";
  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${color}`}
      title="WebSocket Finnhub (trades US)"
    >
      {status === "live" && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-success mr-1 animate-pulse" />
      )}
      {label}
    </span>
  );
}
