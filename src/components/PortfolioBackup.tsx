"use client";

import { useRef, useState } from "react";
import {
  PERSIST_KEYS,
  persistGetString,
  persistSetString,
  persistGetJSON,
  persistSetJSON,
  loadPositions,
  savePositions,
  loadWatchlist,
  saveWatchlist,
  loadAlerts,
  saveAlerts,
  loadRecentSymbols,
} from "@/lib/persist";

export function PortfolioBackup() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const exportBackup = () => {
    try {
      const payload = {
        version: 2,
        app: "MX Cartera Global",
        exportedAt: new Date().toISOString(),
        positions: loadPositions(),
        watchlist: loadWatchlist(),
        alerts: loadAlerts(),
        recentSymbols: loadRecentSymbols(),
        goal: persistGetString(PERSIST_KEYS.goal),
        divGoal: persistGetString(PERSIST_KEYS.divGoal),
        projection: persistGetString(PERSIST_KEYS.projection),
        divProjection: persistGetString(PERSIST_KEYS.divProj),
        prefs: persistGetJSON(PERSIST_KEYS.prefs, {}),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mx-cartera-global-backup-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      try {
        localStorage.setItem("mxcg_last_backup_at", new Date().toISOString());
      } catch {
        /* */
      }
      setMsg("Copia de seguridad descargada (cartera, lista de seguimiento, alertas…).");
    } catch {
      setMsg("No se pudo exportar.");
    }
  };

  const importBackup = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || typeof data !== "object") throw new Error("formato");
      if (Array.isArray(data.positions)) {
        savePositions(data.positions);
      } else if (Array.isArray(data)) {
        savePositions(data);
      } else {
        throw new Error("sin positions");
      }
      if (Array.isArray(data.watchlist)) saveWatchlist(data.watchlist);
      if (Array.isArray(data.alerts)) saveAlerts(data.alerts);
      if (Array.isArray(data.recentSymbols))
        persistSetJSON(PERSIST_KEYS.recentSymbols, data.recentSymbols);
      if (data.goal != null)
        persistSetString(PERSIST_KEYS.goal, String(data.goal));
      if (data.divGoal != null)
        persistSetString(PERSIST_KEYS.divGoal, String(data.divGoal));
      if (data.projection != null)
        persistSetString(PERSIST_KEYS.projection, String(data.projection));
      if (data.divProjection != null)
        persistSetString(PERSIST_KEYS.divProj, String(data.divProjection));
      if (data.prefs && typeof data.prefs === "object")
        persistSetJSON(PERSIST_KEYS.prefs, data.prefs);
      setMsg("Copia restaurada. Recarga la página.");
    } catch {
      setMsg("Archivo inválido.");
    }
  };

  return (
    <section className="bg-card rounded-xl border border-border p-4 space-y-3">
      <h2 className="text-sm font-semibold">Copia de seguridad de vez en cuando</h2>
      <p className="text-[11px] text-muted leading-relaxed">
        Exporta o restaura todo lo guardado en este dispositivo: cartera,
        lista de seguimiento, alertas, metas y preferencias (JSON). Recomendado cada 2
        semanas o al cambiar de teléfono.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={exportBackup}
          className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
        >
          Exportar
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold"
        >
          Importar
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importBackup(f);
            e.target.value = "";
          }}
        />
      </div>
      {msg && <p className="text-xs text-muted text-center">{msg}</p>}
    </section>
  );
}
