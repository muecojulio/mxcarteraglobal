"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useUsdMxn, formatMxn } from "@/lib/fx";

type IpoItem = {
  date: string;
  symbol?: string;
  name: string;
  exchange?: string;
  price?: string;
  status?: string;
  numberOfShares?: number;
  totalSharesValue?: number;
};

function formatDay(iso: string) {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("es-MX", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatShares(n?: number) {
  if (n == null) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M acciones`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K acciones`;
  return `${n} acciones`;
}

function formatValueMxn(n?: number, usdMxn?: number | null) {
  if (n == null || n === 0) return null;
  const rate = usdMxn && usdMxn > 0 ? usdMxn : 17.5;
  const mxn = n * rate;
  if (mxn >= 1_000_000_000)
    return `${(mxn / 1_000_000_000).toFixed(2)} mil M MXN`;
  if (mxn >= 1_000_000) return `${(mxn / 1_000_000).toFixed(1)} M MXN`;
  return formatMxn(mxn, 0);
}

/** Convierte precio IPO (número o rango "15-17") a texto en MXN */
function formatIpoPriceMxn(price?: string, usdMxn?: number | null) {
  if (!price) return null;
  const rate = usdMxn && usdMxn > 0 ? usdMxn : 17.5;
  const raw = String(price).trim();
  // rango tipo 15-17 o 15 - 17
  const range = raw.match(
    /^\$?\s*([\d.]+)\s*[-–]\s*\$?\s*([\d.]+)/
  );
  if (range) {
    const a = Number(range[1]) * rate;
    const b = Number(range[2]) * rate;
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return `${formatMxn(a)} – ${formatMxn(b)}`;
    }
  }
  const num = Number(raw.replace(/[^0-9.]/g, ""));
  if (Number.isFinite(num) && num > 0) {
    return formatMxn(num * rate);
  }
  return raw; // si no se puede parsear, se deja el texto original
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  expected: {
    label: "Esperado",
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
  filed: {
    label: "Registrado",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  priced: {
    label: "Precio fijado",
    className: "bg-green-500/15 text-green-600 dark:text-green-400",
  },
  withdrawn: {
    label: "Retirado",
    className: "bg-red-500/15 text-red-600 dark:text-red-400",
  },
};

export default function IpoPage() {
  const { fx } = useUsdMxn(120_000);
  const usdMxn = fx?.usdMxn ?? null;
  const [status, setStatus] = useState<"all" | "expected" | "filed" | "priced">(
    "all"
  );
  const [search, setSearch] = useState("");
  const [ipos, setIpos] = useState<IpoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingReal, setUsingReal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q =
        status === "all"
          ? "/api/ipo"
          : `/api/ipo?status=${status}`;
      const res = await fetch(q);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setIpos(data.ipos || []);
      setUsingReal(Boolean(data.usingRealData));
      if (data.error) setError(data.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setIpos([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return ipos;
    const q = search.toLowerCase();
    return ipos.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.symbol || "").toLowerCase().includes(q) ||
        (i.exchange || "").toLowerCase().includes(q)
    );
  }, [ipos, search]);

  const byDate = useMemo(() => {
    const map = new Map<string, IpoItem[]>();
    for (const i of filtered) {
      const list = map.get(i.date) || [];
      list.push(i);
      map.set(i.date, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const upcomingCount = ipos.filter((i) => {
    const st = (i.status || "").toLowerCase();
    return st === "expected" || st === "priced" || !st;
  }).length;

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border safe-top">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Ofertas públicas</h1>
            {usingReal && (
              <span className="text-[10px] font-medium bg-success/15 text-success px-2 py-0.5 rounded-full">
                EN VIVO
              </span>
            )}
          </div>
          <button
            onClick={() => load()}
            className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted text-sm active:scale-95"
            aria-label="Actualizar"
          >
            ↻
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full">
        {/* Resumen */}
        <div className="px-4 pt-4 pb-2">
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted uppercase tracking-wide">
              Próximas salidas a bolsa
            </p>
            <p className="text-2xl font-bold mt-1">{upcomingCount}</p>
            <p className="text-xs text-muted mt-1">
              Datos Finnhub · ~2 meses de ventana
            </p>
          </div>
        </div>

        {/* Filtros estado */}
        <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
          {(
            [
              { key: "all", label: "Todos" },
              { key: "expected", label: "Esperados" },
              { key: "filed", label: "Registrados" },
              { key: "priced", label: "Precio fijado" },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                status === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Buscar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">
              🔍
            </span>
            <input
              type="search"
              placeholder="Buscar nombre, símbolo o bolsa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card border border-border rounded-xl py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="px-4 pb-8">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-card rounded-xl border border-border animate-pulse"
                />
              ))}
            </div>
          ) : error && ipos.length === 0 ? (
            <p className="text-center text-danger py-10 text-sm">{error}</p>
          ) : byDate.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🚀</p>
              <p className="font-medium">Sin ofertas en este filtro</p>
              <p className="text-sm text-muted mt-1">
                Prueba otro estado o búsqueda
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {byDate.map(([date, dayIpos]) => (
                <section key={date}>
                  <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
                    {formatDay(date)}
                  </h2>
                  <div className="space-y-2">
                    {dayIpos.map((ipo, idx) => {
                      const st = STATUS_LABEL[(ipo.status || "").toLowerCase()] || {
                        label: ipo.status || "—",
                        className: "bg-secondary text-muted",
                      };
                      return (
                        <div
                          key={`${ipo.symbol}-${ipo.date}-${idx}`}
                          className="bg-card rounded-xl border border-border p-4"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-sm leading-snug">
                                {ipo.name}
                              </p>
                              {ipo.symbol && (
                                <p className="text-xs text-muted mt-0.5">
                                  {ipo.symbol}
                                  {ipo.exchange ? ` · ${ipo.exchange}` : ""}
                                </p>
                              )}
                            </div>
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${st.className}`}
                            >
                              {st.label}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                            {ipo.price && (
                              <span>
                                Precio:{" "}
                                <span className="text-foreground font-medium">
                                  {formatIpoPriceMxn(ipo.price, usdMxn)}
                                </span>
                              </span>
                            )}
                            {formatShares(ipo.numberOfShares) && (
                              <span>{formatShares(ipo.numberOfShares)}</span>
                            )}
                            {formatValueMxn(ipo.totalSharesValue, usdMxn) && (
                              <span>
                                Valor:{" "}
                                <span className="text-foreground font-medium">
                                  {formatValueMxn(ipo.totalSharesValue, usdMxn)}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}

          <p className="text-[11px] text-muted text-center mt-6 leading-relaxed">
            Precios y valores en pesos mexicanos (tipo de cambio USD/MXN).
            Calendario vía Finnhub (principalmente EE.UU.). No es asesoramiento
            de inversión.
          </p>
        </div>
      </main>
    </div>
  );
}
