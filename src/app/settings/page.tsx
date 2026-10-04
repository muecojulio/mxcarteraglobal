"use client";
import { PortfolioBackup } from "@/components/PortfolioBackup";
import { CloudVaultPanel } from "@/components/CloudVaultPanel";
import { TaxEstimator } from "@/components/TaxEstimator";
import { useEffect, useState } from "react";
import { isLockEnabled, setPin, disableLock, registerBiometric, setBioPreferred, isBioPreferred, canUseWebAuthn, lockNow, getRecoveryContacts } from "@/lib/app-lock";
import { persistSummary } from "@/lib/persist";
import { getStoredTheme, applyTheme, type ThemeMode } from "@/components/ThemeProvider";

const THEME_OPTIONS: { key: ThemeMode; label: string; desc: string }[] = [
  { key: "system", label: "Sistema", desc: "Sigue el modo del iPhone / dispositivo" },
  { key: "light", label: "Claro", desc: "Fondo claro siempre" },
  { key: "dark", label: "Oscuro", desc: "Fondo oscuro siempre" },
];

export default function SettingsPage() {
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [mounted, setMounted] = useState(false);
  const [lockOn, setLockOn] = useState(false);
  const [bioOn, setBioOn] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [lockMsg, setLockMsg] = useState("");
  const [lockMsgIsError, setLockMsgIsError] = useState(false);
  const [busyAction, setBusyAction] = useState<"pin" | "biometric" | null>(null);
  const [copyBusy, setCopyBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [recoveryShown, setRecoveryShown] = useState("");
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setTheme(getStoredTheme());
      setLockOn(isLockEnabled());
      setBioOn(isBioPreferred());
      const c = getRecoveryContacts();
      setEmail(c.email); setPhone(c.phone);
      setMounted(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  if (!mounted) return <div className="px-4 py-8 text-sm text-muted">Cargando…</div>;
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto"><h1 className="text-lg font-bold">Configuración</h1></div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-6 pb-10">
        <PortfolioBackup /><CloudVaultPanel /><TaxEstimator />
        <section>
          <h2 className="text-xs font-semibold text-muted uppercase mb-2">Apariencia</h2>
          <div className="space-y-2">{THEME_OPTIONS.map((o) => (
            <button key={o.key} type="button" aria-pressed={theme === o.key} className={`ui-option-card w-full text-left bg-card border rounded-xl p-3 ${theme === o.key ? "border-primary" : "border-border"}`} onClick={() => { setTheme(o.key); applyTheme(o.key); }}>
              <p className="font-medium text-sm">{o.label}</p><p className="text-xs text-muted">{o.desc}</p>
              {theme === o.key ? <p className="mt-1 text-xs font-semibold text-primary">✓ Seleccionado</p> : null}
            </button>
          ))}</div>
        </section>
        <section>
          <h2 className="text-xs font-semibold text-muted uppercase mb-2">Seguridad</h2>
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <p className="text-xs text-muted">Al abrir la app pedirá tu clave. Opcional: Face ID / huella. Todo queda en este dispositivo.</p>
            {!lockOn ? (
              <>
                <label className="block space-y-1 text-xs font-medium" htmlFor="new-pin">Nueva clave (4–12 caracteres)
                  <input id="new-pin" className="ui-input" type="password" inputMode="numeric" maxLength={12} autoComplete="new-password" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\s/g, ""))} />
                </label>
                <label className="block space-y-1 text-xs font-medium" htmlFor="confirm-pin">Confirmar clave
                  <input id="confirm-pin" className="ui-input" type="password" inputMode="numeric" maxLength={12} autoComplete="new-password" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\s/g, ""))} />
                </label>
                <label className="block space-y-1 text-xs font-medium" htmlFor="recovery-email">Correo de recuperación (opcional)
                  <input id="recovery-email" className="ui-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
                <label className="block space-y-1 text-xs font-medium" htmlFor="recovery-phone">Celular de recuperación (opcional)
                  <input id="recovery-phone" className="ui-input" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </label>
                <button type="button" className="ui-btn ui-btn-primary w-full" disabled={busyAction !== null} aria-busy={busyAction === "pin"} onClick={async () => {
                  if (busyAction) return;
                  setLockMsg(""); setLockMsgIsError(false); setRecoveryShown("");
                  if (newPin.length < 4) { setLockMsgIsError(true); setLockMsg("Mínimo 4 caracteres"); return; }
                  if (newPin !== confirmPin) { setLockMsgIsError(true); setLockMsg("Las claves no coinciden"); return; }
                  setBusyAction("pin");
                  try {
                    const { recoveryCode } = await setPin(newPin, { email, phone });
                    setLockOn(true); setNewPin(""); setConfirmPin(""); setRecoveryShown(recoveryCode);
                    setLockMsg("Clave activada. Guarda el código de recuperación.");
                  } catch (e) {
                    setLockMsgIsError(true);
                    setLockMsg(e instanceof Error ? e.message : "No se pudo activar la clave.");
                  } finally { setBusyAction(null); }
                }}>{busyAction === "pin" ? "Activando…" : "Activar clave"}</button>
              </>
            ) : (
              <>
                <button type="button" className="ui-btn ui-btn-secondary w-full" onClick={() => lockNow()}>Bloquear ahora</button>
                {canUseWebAuthn() ? (
                  <button type="button" className="ui-btn ui-btn-secondary w-full" disabled={busyAction !== null} aria-busy={busyAction === "biometric"} onClick={async () => {
                    if (busyAction) return;
                    setBusyAction("biometric"); setLockMsg(""); setLockMsgIsError(false);
                    try {
                      const ok = await registerBiometric();
                      if (ok) { setBioPreferred(true); setBioOn(true); setLockMsg("Biometría registrada."); }
                      else { setLockMsgIsError(true); setLockMsg("No se pudo registrar la biometría."); }
                    } catch (e) {
                      setLockMsgIsError(true);
                      setLockMsg(e instanceof Error ? e.message : "No se pudo registrar la biometría.");
                    } finally { setBusyAction(null); }
                  }}>{busyAction === "biometric" ? "Registrando…" : "Registrar biometría"}</button>
                ) : null}
                <p className="text-xs text-muted">Biometría {bioOn ? "preferida" : "apagada"}</p>
                <button type="button" className="ui-text-action text-danger text-sm" onClick={() => { disableLock(); setLockOn(false); setRecoveryShown(""); }}>Quitar candado</button>
              </>
            )}
            {recoveryShown ? (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-center space-y-2">
                <p className="text-[10px] uppercase text-muted font-semibold">Código de recuperación (guárdalo ya)</p>
                <p className="text-lg font-mono font-bold tracking-widest">{recoveryShown}</p>
                <button type="button" className="ui-btn ui-btn-ghost text-xs min-h-11" disabled={copyBusy} aria-busy={copyBusy} onClick={async () => {
                  setCopyBusy(true);
                  try { await navigator.clipboard.writeText(recoveryShown); setLockMsgIsError(false); setLockMsg("Código copiado."); }
                  catch { setLockMsgIsError(true); setLockMsg("Copia el código a mano."); }
                  finally { setCopyBusy(false); }
                }}>{copyBusy ? "Copiando…" : "Copiar código"}</button>
              </div>
            ) : null}
            {lockMsg ? <p className={`text-xs ${lockMsgIsError ? "text-danger" : "text-muted"}`} role={lockMsgIsError ? "alert" : "status"} aria-live={lockMsgIsError ? "assertive" : "polite"}>{lockMsg}</p> : null}
          </div>
        </section>
        <section>
          <h2 className="text-xs font-semibold text-muted uppercase mb-2">Datos en este dispositivo</h2>
          <div className="bg-card rounded-xl border border-border p-4 space-y-1">
            {persistSummary().map((row) => <p key={row.key} className="text-xs">{row.label}: {row.items}</p>)}
          </div>
        </section>
      </main>
    </div>
  );
}
