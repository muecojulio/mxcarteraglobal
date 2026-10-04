"use client";

import { useEffect, useState } from "react";
import { isLockEnabled, isUnlockedThisSession, markUnlocked, verifyPin } from "@/lib/app-lock";

export default function AppLock({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const need = isLockEnabled() && !isUnlockedThisSession();
      setLocked(need);
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!ready) return null;
  if (!locked) return <>{children}</>;

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 gap-3">
      <h1 className="text-lg font-bold">Desbloquear</h1>
      <form className="w-full flex flex-col items-center gap-3" onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        try {
          const ok = await verifyPin(pin);
          if (ok) { markUnlocked(); setLocked(false); }
          else setError("Clave incorrecta");
        } catch {
          setError("No se pudo verificar la clave. Inténtalo de nuevo.");
        } finally { setBusy(false); }
      }}>
        <label className="sr-only" htmlFor="unlock-pin">Clave de acceso</label>
        <input id="unlock-pin" className="ui-input max-w-xs" type="password" inputMode="numeric" autoComplete="current-password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Clave" />
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
        <button type="submit" className="ui-btn ui-btn-primary" disabled={busy || !pin} aria-busy={busy}>
          {busy ? "Verificando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
