"use client";
const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
export function MonthGrid({
  amounts,
}: {
  amounts: number[];
}) {
  const vals = amounts.length === 12 ? amounts : Array.from({ length: 12 }, (_, i) => amounts[i] || 0);
  const max = Math.max(1, ...vals);
  return (
    <div className="grid grid-cols-6 gap-1">
      {MONTHS.map((m, i) => (
        <div key={m} className="bg-secondary rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted">{m}</p>
          <div className="h-8 flex items-end justify-center">
            <div className="w-3 rounded-sm bg-primary" style={{ height: `${Math.round((vals[i] / max) * 32)}px` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
