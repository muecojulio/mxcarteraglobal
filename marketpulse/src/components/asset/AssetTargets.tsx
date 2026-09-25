export function AssetTargets({
  priceTarget,
  earnings,
}: {
  priceTarget?: {
    consensus: number | null;
    median: number | null;
    high: number | null;
    low: number | null;
  } | null;
  earnings?: Array<{ period: string; estimate: number | null; actual: number | null; surprisePercent: number | null }>;
}) {
  const t = priceTarget;
  const rows = earnings || [];
  if (!t && rows.length === 0) return null;
  return (
    <div className="text-xs space-y-2">
      {t ? (
        <p>
          Objetivo consenso {t.consensus ?? "—"} · med {t.median ?? "—"} · alto {t.high ?? "—"} · bajo {t.low ?? "—"}
        </p>
      ) : null}
      {rows.slice(0, 8).map((e) => (
        <p key={e.period}>
          {e.period} · est {e.estimate ?? "—"} · real {e.actual ?? "—"}
          {e.surprisePercent != null ? ` · sorpresa ${e.surprisePercent}%` : ""}
        </p>
      ))}
    </div>
  );
}
