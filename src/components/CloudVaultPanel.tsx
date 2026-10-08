"use client";

import { useEffect, useState } from "react";
import { vaultStatus } from "@/lib/crypto-vault";
import { hydrateVaultPersist } from "@/lib/persist";
import { ensureDeviceVault } from "@/lib/crypto-vault";
import {
  getLastSyncAt,
  getSyncId,
  pullCloud,
  pushCloud,
} from "@/lib/cloud-sync";
import { isLockEnabled } from "@/lib/app-lock";

export function CloudVaultPanel() {
  const [status, setStatus] = useState(vaultStatus());
  const [syncId, setSyncId] = useState("");
  const [last, setLast] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [pullId, setPullId] = useState("");
  const [cloudPass, setCloudPass] = useState("");

  useEffect(() => {
    setStatus(vaultStatus());
    setSyncId(getSyncId() || "");
    setLast(getLastSyncAt());
    void (async () => {
      try {
        await ensureDeviceVault();
        await hydrateVaultPersist();
        setStatus(vaultStatus());
      } catch {
        /* */
      }
    })();
  }, []);

  const onPush = async () => {
    setBusy(true);
    setMsg("");
    try {
      await ensureDeviceVault();
      await hydrateVaultPersist();
      const { id } = await pushCloud(cloudPass);
      setSyncId(id);
      setLast(new Date().toISOString());
      setMsg("Subido. El archivo en la nube está cifrado.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error al subir");
    } finally {
      setBusy(false);
    }
  };

  const onPull = async () => {
    setBusy(true);
    setMsg("");
    try {
      await ensureDeviceVault();
      await pullCloud(pullId || syncId, cloudPass);
      setSyncId(getSyncId() || pullId);
      setLast(new Date().toISOString());
      setMsg("Bajado. Recarga la página para ver cartera y listas.");
    } catch (e) {
      setMsg(
        e instanceof Error
          ? e.message +
              (isLockEnabled()
                ? " Usa el mismo NIP que en el otro aparato."
                : "")
          : "Error al bajar"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold text-muted uppercase tracking-wide px-1">
        Cifrado y nube
      </h2>
      <div className="bg-card rounded-xl border border-border p-4 space-y-3 text-sm">
        <p className="text-xs text-muted leading-relaxed">
          La cartera, watchlist, alertas y metas se guardan cifradas en este
          teléfono. La nube solo guarda un paquete ilegible. Para pasar a otro
          dispositivo usa el mismo NIP (si lo configuraste).
        </p>
        <p className="text-xs">
          Estado del cifrado:{" "}
          <span className="font-medium">
            {status === "session"
              ? "activo en esta sesión"
              : status === "wrapped"
              ? "cerrado (abre con NIP)"
              : status === "device"
              ? "activo (llave de este aparato)"
              : "preparando"}
          </span>
        </p>

        <input
          type="password"
          className="w-full min-h-[48px] rounded-xl border border-border px-3 bg-background"
          placeholder="Clave de nube (usa tu NIP)"
          value={cloudPass}
          onChange={(e) => setCloudPass(e.target.value)}
        />

        <button
          type="button"
          disabled={busy}
          onClick={onPush}
          className="w-full min-h-[48px] rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
        >
          {busy ? "Espera…" : "Subir copia cifrada"}
        </button>

        {syncId && (
          <div>
            <p className="text-[11px] text-muted mb-1">ID de nube (guárdalo)</p>
            <p className="text-xs font-mono break-all bg-secondary rounded-lg px-2 py-2">
              {syncId}
            </p>
          </div>
        )}
        {last && (
          <p className="text-[11px] text-muted">
            Última sync: {new Date(last).toLocaleString("es-MX")}
          </p>
        )}

        <input
          className="w-full min-h-[48px] rounded-xl border border-border px-3 bg-background"
          placeholder="ID de otro dispositivo"
          value={pullId}
          onChange={(e) => setPullId(e.target.value)}
        />
        <button
          type="button"
          disabled={busy}
          onClick={onPull}
          className="w-full min-h-[48px] rounded-xl border border-border font-semibold disabled:opacity-50"
        >
          Bajar copia cifrada
        </button>
        {msg && <p className="text-xs text-muted text-center">{msg}</p>}
      </div>
    </section>
  );
}
