"use client";

import { useEffect, useState, useCallback } from "react";
import {
  useHydratedState,
  useMounted,
  localStorageIdentity,
} from "@/lib/use-hydrated-value";
import {
  isLockEnabled,
  isUnlockedThisSession,
  markUnlocked,
  verifyPin,
  lockoutRemainingMs,
  tryBiometricUnlock,
  isBioPreferred,
  canUseWebAuthn,
  hasRecoveryCode,
  resetPinWithRecovery,
  getRecoveryContacts,
} from "@/lib/app-lock";

/** Constante de módulo: useSyncExternalStore exige un snapshot estable. */
const EMPTY_CONTACTS = { email: "", phone: "" };

export default function AppLock({ children }: { children: React.ReactNode }) {
  // `ready` evita el parpadeo de la pantalla de bloqueo durante la hidratación;
  // `needsLock` y `contacts` salen del almacenamiento local durante el render.
  const ready = useMounted();
  const [needsLock, setNeedsLock] = useHydratedState(
    () => `${localStorage.getItem("mxcg_lock_enabled") ?? ""}|${
      localStorage.getItem("mxcg_lock_unlocked") ?? ""
    }`,
    () => isLockEnabled() && !isUnlockedThisSession(),
    false
  );
  const [mode, setMode] = useState<"pin" | "recover">("pin");
  const [pin, setPin] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [contacts] = useHydratedState(
    localStorageIdentity("mxcg_lock_email"),
    getRecoveryContacts,
    EMPTY_CONTACTS
  );

  // El intento biométrico es el único trabajo del effect; el resto se hidrata
  // durante el render.
  useEffect(() => {
    if (needsLock && isBioPreferred() && canUseWebAuthn()) {
      tryBiometricUnlock().then((ok) => {
        if (ok) setNeedsLock(false);
      });
    }
  }, [needsLock, setNeedsLock]);

  const onSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setError("");
      setBusy(true);
      try {
        const wait = lockoutRemainingMs();
        if (wait > 0) {
          setError(`Espera ${Math.ceil(wait / 1000)} s tras varios intentos`);
          setPin("");
          return;
        }
        const ok = await verifyPin(pin);
        if (ok) {
          markUnlocked();
          setNeedsLock(false);
          setPin("");
        } else {
          const again = lockoutRemainingMs();
          setError(
            again > 0
              ? `Demasiados intentos. Espera ${Math.ceil(again / 1000)} s`
              : "Clave incorrecta"
          );
          setPin("");
        }
      } finally {
        setBusy(false);
      }
    },
    [pin, setNeedsLock]
  );

  const onRecover = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    setBusy(true);
    try {
      await resetPinWithRecovery(recoveryCode, newPin);
      setNeedsLock(false);
      setRecoveryCode("");
      setNewPin("");
      setMode("pin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo recuperar");
    } finally {
      setBusy(false);
    }
  };

  const onBio = async () => {
    setError("");
    setBusy(true);
    try {
      const ok = await tryBiometricUnlock();
      if (ok) setNeedsLock(false);
      else setError("No se pudo usar biométricos. Usa tu clave o recupérala.");
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-full flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!needsLock) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center px-6 safe-top safe-bottom">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/15 flex items-center justify-center text-3xl">
            🔒
          </div>
          <h1 className="text-xl font-bold">MX Cartera Global</h1>
          <p className="text-sm text-muted mt-1">
            {mode === "pin"
              ? "Ingresa tu clave para continuar"
              : "Recuperar con tu código de respaldo"}
          </p>
        </div>

        {mode === "pin" ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\s/g, ""))}
              placeholder="Clave (4–12)"
              className="w-full text-center text-2xl tracking-[0.35em] bg-card border border-border rounded-2xl py-3.5 px-4 outline-none focus:ring-2 focus:ring-primary/40 min-h-[56px]"
              maxLength={12}
              autoFocus
            />
            {error && (
              <p className="text-sm text-danger text-center font-medium">{error}</p>
            )}
            <button
              type="submit"
              disabled={busy || pin.length < 4}
              className="w-full min-h-[52px] rounded-2xl bg-primary text-primary-foreground font-semibold text-base disabled:opacity-50"
            >
              {busy ? "…" : "Desbloquear"}
            </button>
          </form>
        ) : (
          <form onSubmit={onRecover} className="space-y-3">
            <input
              type="text"
              autoCapitalize="characters"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
              placeholder="Código ABCDE-FGHIJ"
              className="w-full text-center tracking-wider bg-card border border-border rounded-2xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/40 min-h-[52px]"
            />
            <input
              type="password"
              inputMode="numeric"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\s/g, ""))}
              placeholder="Nueva clave (4–12)"
              className="w-full text-center bg-card border border-border rounded-2xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/40 min-h-[52px]"
              maxLength={12}
            />
            {error && (
              <p className="text-sm text-danger text-center font-medium">{error}</p>
            )}
            <button
              type="submit"
              disabled={busy || recoveryCode.length < 8 || newPin.length < 4}
              className="w-full min-h-[52px] rounded-2xl bg-primary text-primary-foreground font-semibold text-base disabled:opacity-50"
            >
              {busy ? "…" : "Restablecer clave"}
            </button>
            {(contacts.email || contacts.phone) && (
              <p className="text-[11px] text-muted text-center leading-relaxed">
                Hay un correo o celular guardado en este dispositivo (oculto).
                Usa el código de recuperación. No se envía SMS ni correo.
              </p>
            )}
          </form>
        )}

        {mode === "pin" && canUseWebAuthn() && (
          <button
            type="button"
            onClick={onBio}
            disabled={busy}
            className="w-full mt-3 min-h-[52px] rounded-2xl bg-card border border-border font-medium text-sm"
          >
            Face ID / Huella / biométricos
          </button>
        )}

        {hasRecoveryCode() && (
          <button
            type="button"
            onClick={() => {
              setMode(mode === "pin" ? "recover" : "pin");
              setError("");
            }}
            className="w-full mt-3 text-sm text-primary font-medium py-2"
          >
            {mode === "pin"
              ? "¿Olvidaste la clave? Recuperar"
              : "Volver a ingresar clave"}
          </button>
        )}

        <p className="text-[11px] text-muted text-center mt-6 leading-relaxed">
          Guarda el código de recuperación al activar la clave en Configuración.
        </p>
      </div>
    </div>
  );
}
