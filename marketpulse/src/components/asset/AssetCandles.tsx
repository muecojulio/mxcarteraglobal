"use client";
type Candle = { t: number; o: number; h: number; l: number; c: number };
export function AssetCandles({ history }: { history: Candle[] }) {
  const data = history.slice(-80);
  if (data.length < 2) return null;
  const highs = data.map((d) => d.h);
  const lows = data.map((d) => d.l);
  const max = Math.max(...highs);
  const min = Math.min(...lows);
  const span = max - min || 1;
  const w = 320;
  const h = 140;
  const slot = w / data.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-36" role="img" aria-label="Velas">
      {data.map((d, i) => {
        const x = i * slot + slot / 2;
        const yHigh = ((max - d.h) / span) * (h - 8) + 4;
        const yLow = ((max - d.l) / span) * (h - 8) + 4;
        const yO = ((max - d.o) / span) * (h - 8) + 4;
        const yC = ((max - d.c) / span) * (h - 8) + 4;
        const up = d.c >= d.o;
        const bodyTop = Math.min(yO, yC);
        const bodyH = Math.max(1.5, Math.abs(yC - yO));
        return (
          <g key={d.t || i}>
            <line x1={x} x2={x} y1={yHigh} y2={yLow} stroke={up ? "#3d7a62" : "#b85c4a"} strokeWidth={1} />
            <rect x={x - Math.max(1.2, slot * 0.28)} y={bodyTop} width={Math.max(2.4, slot * 0.56)} height={bodyH} fill={up ? "#3d7a62" : "#b85c4a"} />
          </g>
        );
      })}
    </svg>
  );
}
