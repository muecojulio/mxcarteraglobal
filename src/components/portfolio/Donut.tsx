"use client";
export function Donut({
  slices,
}: {
  slices: Array<{ label: string; value: number; color: string }>;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="reveal relative w-48 h-48 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        {slices.map((sl) => {
          const pct = sl.value / total;
          const dash = pct * c;
          const el = (
            <circle key={sl.label} cx="50" cy="50" r={r} fill="none" stroke={sl.color} strokeWidth="12" strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset} />
          );
          offset += dash;
          return el;
        })}
        <circle cx="50" cy="50" r="30" className="fill-[var(--card)]" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-xs font-semibold text-muted">Activos</span>
      </div>
    </div>
  );
}
export function yearsToGoal(current: number, goal: number, stockGrowth: number, annualContribution: number) {
  if (goal <= current) return 0;
  if (stockGrowth <= 0 && annualContribution <= 0) return Infinity;
  let v = current;
  let y = 0;
  while (v < goal && y < 120) {
    v = v * (1 + Math.max(stockGrowth, 0)) + Math.max(annualContribution, 0);
    y++;
  }
  return y >= 120 ? Infinity : y;
}
