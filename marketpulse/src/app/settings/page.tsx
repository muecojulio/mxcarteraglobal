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
  useEffect(() => {
    setTheme(getStoredTheme());
    setLockOn(isLockEnabled());
    setBioOn(isBioPreferred());
    getRecoveryContacts();
    setMounted(true);
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
            <button key={o.key} type="button" className={`w-full text-left bg-card border rounded-xl p-3 ${theme === o.key ? "border-primary" : "border-border"}`} onClick={() => { setTheme(o.key); applyTheme(o.key); }}>
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
                <input className="ui-input" type="password" inputMode="numeric" maxLength={12} placeholder="Confirmar" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\s/g, ""))} />
                <button type="button" className="ui-btn ui-btn-primary w-full" onClick={async () => {
                  if (newPin.length < 4 || newPin !== confirmPin) { setLockMsg("La clave no coincide o es corta"); return; }
                  await setPin(newPin); setLockOn(true); setLockMsg("Candado activado");
                }}>Activar candado</button>
              </>
            ) : (
              <>
                <button type="button" className="ui-btn w-full" onClick={() => lockNow()}>Bloquear ahora</button>
                {canUseWebAuthn() ? <button type="button" className="ui-btn w-full" onClick={async () => { await registerBiometric(); setBioPreferred(true); setBioOn(true); }}>Registrar biometría</button> : null}
                <p className="text-xs text-muted">Biometría {bioOn ? "preferida" : "apagada"}</p>
                <button type="button" className="text-danger text-sm" onClick={() => { disableLock(); setLockOn(false); }}>Quitar candado</button>
              </>
            )}
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
