"use client";

import { useEffect, useState } from "react";
import { isLockEnabled, isUnlockedThisSession, markUnlocked, verifyPin } from "@/lib/app-lock";

export default function AppLock({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const need = isLockEnabled() && !isUnlockedThisSession();
    setLocked(need);
    setReady(true);
  }, []);

  if (!ready) return null;
  if (!locked) return <>{children}</>;

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 gap-3">
      <h1 className="text-lg font-bold">Desbloquear</h1>
      <input className="ui-input max-w-xs" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Clave" />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button type="button" className="ui-btn ui-btn-primary" onClick={async () => {
        const ok = await verifyPin(pin);
        if (ok) { markUnlocked(); setLocked(false); } else setError("Clave incorrecta");
      }}>Entrar</button>
    </div>
  );
}
