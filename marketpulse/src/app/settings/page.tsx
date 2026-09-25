"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PortfolioBackup } from "@/components/PortfolioBackup";
import { CloudVaultPanel } from "@/components/CloudVaultPanel";
import { TaxEstimator } from "@/components/TaxEstimator";
import { isLockEnabled, setPin, disableLock, registerBiometric, setBioPreferred, isBioPreferred, canUseWebAuthn, lockNow, getRecoveryContacts } from "@/lib/app-lock";
import { persistSummary } from "@/lib/persist";
import { getStoredTheme, applyTheme, type ThemeMode } from "@/components/ThemeProvider";
const THEME_OPTIONS: { key: ThemeMode; label: string }[] = [
  { key: "system", label: "Sistema" }, { key: "light", label: "Claro" }, { key: "dark", label: "Oscuro" },
];
export default function SettingsPage() {
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [lockOn, setLockOn] = useState(false);
  const [bioOn, setBioOn] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [lockMsg, setLockMsg] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [recovery, setRecovery] = useState("");
  useEffect(() => {
    setTheme(getStoredTheme()); setLockOn(isLockEnabled()); setBioOn(isBioPreferred());
    const c = getRecoveryContacts(); setEmail(c.email); setPhone(c.phone);
  }, []);
  const summary = persistSummary();
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto"><h1 className="text-lg font-bold">Configuración</h1></div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        <section className="space-y-2">
          <p className="text-xs font-semibold text-muted uppercase">Tema</p>
          <div className="flex gap-2">{THEME_OPTIONS.map((o) => (
            <button key={o.key} type="button" className={theme === o.key ? "ui-chip ui-chip-active" : "ui-chip"} onClick={() => { setTheme(o.key); applyTheme(o.key); }}>{o.label}</button>
          ))}</div>
        </section>
        <section className="space-y-2">
          <p className="text-xs font-semibold text-muted uppercase">Candado</p>
          <input className="ui-input" type="password" placeholder="Nueva clave 4-12" value={newPin} onChange={(e) => setNewPin(e.target.value)} />
          <button type="button" className="ui-btn ui-btn-primary w-full" onClick={async () => {
            try { const r = await setPin(newPin, { email, phone }); setLockOn(true); setRecovery(r.recoveryCode); setLockMsg("Candado activo. Guarda el código."); }
            catch (e) { setLockMsg(e instanceof Error ? e.message : "Error"); }
          }}>Activar candado</button>
          {lockOn && <button type="button" className="ui-btn w-full" onClick={() => { disableLock(); setLockOn(false); }}>Quitar candado</button>}
          {canUseWebAuthn() && <button type="button" className="ui-btn w-full" onClick={async () => { const ok = await registerBiometric(); setBioOn(ok); setBioPreferred(ok); }}>Biometría {bioOn ? "on" : "off"}</button>}
          {lockOn && <button type="button" className="ui-btn w-full" onClick={() => lockNow()}>Bloquear ahora</button>}
          {recovery ? <p className="text-xs font-mono break-all">Recuperación: {recovery}</p> : null}
          {lockMsg ? <p className="text-xs text-muted">{lockMsg}</p> : null}
        </section>
        <TaxEstimator />
        <PortfolioBackup />
        <CloudVaultPanel />
        <section className="text-xs text-muted space-y-1">{summary.map((s) => <p key={s.key}>{s.label}: {String(s.items)}</p>)}</section>
        <Link href="/install" className="ui-btn ui-btn-primary w-full">Instalar / QR</Link>
        <Link href="/legal" className="block text-sm underline">Avisos legales</Link>
      </main>
    </div>
  );
}
