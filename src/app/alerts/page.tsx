"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useQuotes } from "@/lib/market-data/client";
import { loadAlerts as loadAlertsStore, saveAlerts as saveAlertsStore } from "@/lib/persist";
import {
  useHydratedState,
  useMounted,
  localStorageIdentity,
} from "@/lib/use-hydrated-value";

type AlertCondition = "above" | "below";

type PriceAlert = {
  id: string;
  symbol: string;
  condition: AlertCondition;
  target: number;
  createdAt: string;
  triggeredAt?: string;
  active: boolean;
};

/** Constante de módulo: useSyncExternalStore exige un snapshot estable. */
const EMPTY_ALERTS: PriceAlert[] = [];

function formatPrice(n: number) {
  return n.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useHydratedState<PriceAlert[]>(
    localStorageIdentity("marketpulse_price_alerts"),
    () => loadAlertsStore() as PriceAlert[],
    EMPTY_ALERTS
  );
  const ready = useMounted();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    symbol: "",
    condition: "above" as AlertCondition,
    target: "",
  });

  const symbols = useMemo(
    () =>
      [...new Set(alerts.filter((a) => a.active).map((a) => a.symbol))],
    [alerts]
  );

  const { data: quotesData, loading: quotesLoading, refresh } = useQuotes(
    symbols,
    30_000
  );

  const priceMap = useMemo(() => {
    const m = new Map<string, number>();
    (quotesData?.quotes ?? []).forEach((q) =>
      m.set(q.symbol.toUpperCase(), q.price)
    );
    return m;
  }, [quotesData]);

  // Marcar alertas disparadas cuando llegan precios nuevos.
  //
  // Esto es el patrón documentado de React para "ajustar estado cuando cambia
  // un dato": setState durante el render, no dentro de un effect. Antes era un
  // effect con setState síncrono (lo que marcaba react-hooks/set-state-in-effect).
  const [evaluatedFor, setEvaluatedFor] = useState<Map<string, number> | null>(
    null
  );
  if (ready && priceMap.size > 0 && evaluatedFor !== priceMap) {
    const next = alerts.map((a) => {
      if (!a.active || a.triggeredAt) return a;
      const price = priceMap.get(a.symbol.toUpperCase());
      if (price == null) return a;
      const hit =
        a.condition === "above" ? price >= a.target : price <= a.target;
      return hit
        ? { ...a, triggeredAt: new Date().toISOString(), active: false }
        : a;
    });
    setEvaluatedFor(priceMap);
    if (next.some((a, i) => a !== alerts[i])) setAlerts(next);
  }

  // Persistir es el único efecto: no hace setState.
  useEffect(() => {
    if (!ready) return;
    saveAlertsStore(alerts);
  }, [alerts, ready]);

  const persist = useCallback((next: PriceAlert[]) => {
    setAlerts(next);
    saveAlertsStore(next);
  }, []);

  const addAlert = () => {
    const symbol = form.symbol.trim().toUpperCase();
    const target = parseFloat(form.target);
    if (!symbol || Number.isNaN(target) || target <= 0) return;
    const alert: PriceAlert = {
      id: `${Date.now()}-${symbol}`,
      symbol,
      condition: form.condition,
      target,
      createdAt: new Date().toISOString(),
      active: true,
    };
    persist([alert, ...alerts]);
    setForm({ symbol: "", condition: "above", target: "" });
    setShowAdd(false);
  };

  const removeAlert = (id: string) => {
    persist(alerts.filter((a) => a.id !== id));
  };

  const reactivate = (id: string) => {
    persist(
      alerts.map((a) =>
        a.id === id
          ? { ...a, active: true, triggeredAt: undefined }
          : a
      )
    );
  };

  const active = alerts.filter((a) => a.active);
  const triggered = alerts.filter((a) => a.triggeredAt);

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border safe-top">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <h1 className="text-lg font-bold">Alertas de precio</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refresh()}
              className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted text-sm"
              aria-label="Actualizar precios"
            >
              ↻
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-medium"
              aria-label="Nueva alerta"
            >
              +
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 pb-8">
        <p className="text-xs text-muted pt-3 pb-2 leading-relaxed">
          Las alertas se guardan en este dispositivo. Se revisan al abrir la app
          (no son notificaciones push del sistema todavía).
          {quotesLoading && symbols.length > 0 && " · Actualizando precios…"}
        </p>

        {/* Activas */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
            Activas ({active.length})
          </h2>
          {active.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-6 text-center">
              <p className="text-3xl mb-2">🔔</p>
              <p className="font-medium text-sm">Sin alertas activas</p>
              <p className="text-xs text-muted mt-1">
                Pulsa + para avisar cuando un precio suba o baje de un nivel
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {active.map((a) => {
                const price = priceMap.get(a.symbol.toUpperCase());
                return (
                  <div
                    key={a.id}
                    className="bg-card rounded-xl border border-border p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/asset/${encodeURIComponent(a.symbol)}`}
                          className="font-semibold text-sm"
                        >
                          {a.symbol}
                        </Link>
                        <p className="text-xs text-muted mt-0.5">
                          Avisar si el precio queda{" "}
                          <span className="font-medium text-foreground">
                            {a.condition === "above" ? "por encima de" : "por debajo de"}{" "}
                            {formatPrice(a.target)}
                          </span>
                        </p>
                        {price != null && (
                          <p className="text-xs mt-1">
                            Ahora:{" "}
                            <span className="font-medium">
                              {formatPrice(price)}
                            </span>
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeAlert(a.id)}
                        className="text-muted hover:text-danger text-sm w-8 h-8"
                        aria-label="Eliminar"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Disparadas */}
        {triggered.length > 0 && (
          <section className="mb-6">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
              Disparadas ({triggered.length})
            </h2>
            <div className="space-y-2">
              {triggered.map((a) => (
                <div
                  key={a.id}
                  className="bg-card rounded-xl border border-success/30 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-success">
                        ✓ {a.symbol}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        Condición:{" "}
                        {a.condition === "above" ? "≥" : "≤"}{" "}
                        {formatPrice(a.target)}
                      </p>
                      {a.triggeredAt && (
                        <p className="text-[11px] text-muted mt-1">
                          {new Date(a.triggeredAt).toLocaleString("es-MX")}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => reactivate(a.id)}
                        className="text-xs px-2 py-1 rounded-lg bg-secondary font-medium"
                      >
                        Reactivar
                      </button>
                      <button
                        onClick={() => removeAlert(a.id)}
                        className="text-muted text-sm w-8 h-8"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Modal añadir */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowAdd(false)}
          />
          <div className="relative bg-card rounded-t-2xl sm:rounded-2xl w-full max-w-lg safe-bottom">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="font-semibold">Nueva alerta</h2>
              <button
                onClick={() => setShowAdd(false)}
                className="text-muted text-xl w-8 h-8"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">
                  Símbolo
                </label>
                <input
                  type="text"
                  placeholder="Ej. AAPL, AMXL.MX, SAP.DE"
                  value={form.symbol}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, symbol: e.target.value }))
                  }
                  className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">
                  Condición
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, condition: "above" }))
                    }
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border ${
                      form.condition === "above"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-muted"
                    }`}
                  >
                    Por encima de ≥
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, condition: "below" }))
                    }
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border ${
                      form.condition === "below"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-muted"
                    }`}
                  >
                    Por debajo de ≤
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">
                  Precio objetivo
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={form.target}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, target: e.target.value }))
                  }
                  className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <button
                onClick={addAlert}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
              >
                Crear alerta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
