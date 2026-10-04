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
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [recoveryShown, setRecoveryShown] = useState("");
  useEffect(() => {
    setTheme(getStoredTheme());
    setLockOn(isLockEnabled());
    setBioOn(isBioPreferred());
    const c = getRecoveryContacts();
    setEmail(c.email); setPhone(c.phone);
    setMounted(true);
  }, []);
  if (!mounted) return <div className="px-4 py-8 text-sm text-muted">Cargando…</div>;
  return (
    <div className="flex flex-col min-h-full">
      <header className="app-header safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto"><h1 className="text-lg font-bold">Configuración</h1></div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-6 pb-10 stagger">
        <PortfolioBackup /><CloudVaultPanel /><TaxEstimator />
        <section>
          <h2 className="text-xs font-semibold text-muted uppercase mb-2">Apariencia</h2>
          <div className="space-y-2">{THEME_OPTIONS.map((o) => (
            <button key={o.key} type="button" className={`tap w-full text-left bg-card border rounded-xl p-3 ${theme === o.key ? "border-primary" : "border-border"}`} onClick={() => { setTheme(o.key); applyTheme(o.key); }}>
              <p className="font-medium text-sm">{o.label}</p><p className="text-xs text-muted">{o.desc}</p>
            </button>
          ))}</div>
        </section>
        <section>
          <h2 className="text-xs font-semibold text-muted uppercase mb-2">Seguridad</h2>
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <p className="text-xs text-muted">Al abrir la app pedirá tu clave. Opcional: Face ID / huella. Todo queda en este dispositivo.</p>
            {!lockOn ? (
              <>
                <input className="ui-input" type="password" inputMode="numeric" maxLength={12} placeholder="Nueva clave (4–12)" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\s/g, ""))} />
                <input className="ui-input" type="password" inputMode="numeric" maxLength={12} placeholder="Confirmar clave" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\s/g, ""))} />
                <input className="ui-input" type="email" placeholder="Correo (opcional)" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input className="ui-input" type="tel" placeholder="Celular (opcional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <button type="button" className="ui-btn ui-btn-primary w-full" onClick={async () => {
                  setLockMsg(""); setRecoveryShown("");
                  if (newPin.length < 4) { setLockMsg("Mínimo 4 caracteres"); return; }
                  if (newPin !== confirmPin) { setLockMsg("Las claves no coinciden"); return; }
                  try {
                    const { recoveryCode } = await setPin(newPin, { email, phone });
                    setLockOn(true); setNewPin(""); setConfirmPin(""); setRecoveryShown(recoveryCode);
                    setLockMsg("Clave activada. Guarda el código de recuperación.");
                  } catch (e) { setLockMsg(e instanceof Error ? e.message : "Error"); }
                }}>Activar clave</button>
              </>
            ) : (
              <>
                <button type="button" className="ui-btn w-full" onClick={() => lockNow()}>Bloquear ahora</button>
                {canUseWebAuthn() ? <button type="button" className="ui-btn w-full" onClick={async () => { const ok = await registerBiometric(); if (ok) { setBioPreferred(true); setBioOn(true); } }}>Registrar biometría</button> : null}
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Entrar con Face ID / huella</p>
                    <p className="text-[11px] text-muted">{canUseWebAuthn() ? "Pide biometría al abrir la app" : "No disponible en este dispositivo"}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={bioOn}
                    aria-label="Entrar con Face ID o huella"
                    className="ui-switch shrink-0"
                    onClick={() => { const next = !bioOn; setBioPreferred(next); setBioOn(next); setLockMsg(next ? "Biometría activada al abrir." : "Biometría desactivada."); }}
                  >
                    <span className="ui-switch-track" aria-hidden="true" />
                    <span className="ui-switch-thumb" aria-hidden="true" />
                  </button>
                </div>
                <button type="button" className="text-danger text-sm" onClick={() => { disableLock(); setLockOn(false); setRecoveryShown(""); }}>Quitar candado</button>
              </>
            )}
            {recoveryShown ? (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-center space-y-2">
                <p className="text-[10px] uppercase text-muted font-semibold">Código de recuperación (guárdalo ya)</p>
                <p className="text-lg font-mono font-bold tracking-widest">{recoveryShown}</p>
                <button type="button" className="text-xs text-primary font-medium" onClick={async () => { try { await navigator.clipboard.writeText(recoveryShown); setLockMsg("Código copiado."); } catch { setLockMsg("Copia el código a mano."); } }}>Copiar</button>
              </div>
            ) : null}
            {lockMsg ? <p className="text-xs text-muted">{lockMsg}</p> : null}
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
