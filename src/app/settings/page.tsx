"use client";

import { PortfolioBackup } from "@/components/PortfolioBackup";
import { CloudVaultPanel } from "@/components/CloudVaultPanel";
import { TaxEstimator } from "@/components/TaxEstimator";

import { useState, useEffect } from "react";
import {
  isLockEnabled,
  setPin,
  disableLock,
  registerBiometric,
  setBioPreferred,
  isBioPreferred,
  canUseWebAuthn,
  lockNow,
  getRecoveryContacts,
} from "@/lib/app-lock";
import { persistSummary } from "@/lib/persist";
import {
  getStoredTheme,
  applyTheme,
  type ThemeMode,
} from "@/components/ThemeProvider";

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
    setEmail(c.email);
    setPhone(c.phone);
    setMounted(true);
  }, []);

  const onTheme = (mode: ThemeMode) => {
    setTheme(mode);
    applyTheme(mode);
  };

  const clearAlerts = () => {
    if (confirm("¿Borrar todas las alertas de precio de este dispositivo?")) {
      localStorage.removeItem("marketpulse_price_alerts");
      alert("Alertas eliminadas");
    }
  };

  const clearWatchlistHint = () => {
    alert(
      "La watchlist y la cartera de esta versión se reinician al recargar si no están en el servidor. En una fase futura se guardarán en la nube con tu cuenta."
    );
  };

  if (!mounted) {
    return (
      <div className="flex flex-col min-h-full">
        <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
          <div className="flex items-center px-4 h-14 max-w-lg mx-auto">
            <h1 className="text-lg font-bold">Configuración</h1>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto">
          <h1 className="text-lg font-bold">Configuración</h1>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-6 pb-10">
        <div className="max-w-lg mx-auto w-full px-4 pt-4 space-y-4">
          <PortfolioBackup />
          <CloudVaultPanel />
          <TaxEstimator />
        </div>


        {/* Seguridad */}
        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
            Seguridad
          </h2>
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <p className="text-xs text-muted leading-relaxed">
              Al abrir la app pedirá tu clave. Opcional: Face ID / huella en dispositivos compatibles.
              Todo queda solo en este dispositivo.
            </p>
            {!lockOn ? (
              <>
                <input
                  type="password"
                  inputMode="numeric"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\s/g, ""))}
                  placeholder="Nueva clave (4–12)"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm min-h-[48px]"
                  maxLength={12}
                />
                <input
                  type="password"
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\s/g, ""))}
                  placeholder="Confirmar clave"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm min-h-[48px]"
                  maxLength={12}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Correo (opcional, para futuro SMS/email)"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm min-h-[48px]"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Celular (opcional, para futuro SMS)"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm min-h-[48px]"
                />
                <button
                  type="button"
                  className="w-full min-h-[48px] rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
                  onClick={async () => {
                    setLockMsg("");
                    setRecoveryShown("");
                    if (newPin.length < 4) {
                      setLockMsg("Mínimo 4 caracteres");
                      return;
                    }
                    if (newPin !== confirmPin) {
                      setLockMsg("Las claves no coinciden");
                      return;
                    }
                    try {
                      const { recoveryCode } = await setPin(newPin, {
                        email,
                        phone,
                      });
                      setLockOn(true);
                      setNewPin("");
                      setConfirmPin("");
                      setRecoveryShown(recoveryCode);
                      setLockMsg(
                        "Clave activada. Guarda el código de recuperación: sin él no podrás restablecer la clave."
                      );
                    } catch (e) {
                      setLockMsg(e instanceof Error ? e.message : "Error");
                    }
                  }}
                >
                  Activar clave
                </button>
                {recoveryShown && (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-center space-y-2">
                    <p className="text-[10px] uppercase text-muted font-semibold mb-1">
                      Código de recuperación (guárdalo ya)
                    </p>
                    <p className="text-lg font-mono font-bold tracking-widest">
                      {recoveryShown}
                    </p>
                    <button
                      type="button"
                      className="text-xs text-primary font-medium"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(recoveryShown);
                          setLockMsg("Código copiado. Pégalo en un lugar seguro.");
                        } catch {
                          setLockMsg("Copia el código a mano.");
                        }
                      }}
                    >
                      Copiar código
                    </button>
                    <p className="text-[11px] text-muted">
                      Anótalo fuera del teléfono. Sin este código no podrás
                      restablecer el NIP si lo olvidas.
                    </p>
                    <button
                      type="button"
                      className="w-full min-h-[44px] rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
                      onClick={() => {
                        try {
                          localStorage.setItem("mxcg_recovery_saved", "1");
                        } catch {
                          /* */
                        }
                        setRecoveryShown("");
                        setLockMsg(
                          "Listo. Cuando quieras, haz un backup en la sección de arriba."
                        );
                      }}
                    >
                      Ya lo guardé en un lugar seguro
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-success">Clave activa</p>
                {canUseWebAuthn() && (
                  <button
                    type="button"
                    className="w-full min-h-[48px] rounded-xl bg-secondary text-sm font-medium"
                    onClick={async () => {
                      setLockMsg("");
                      const ok = await registerBiometric();
                      if (ok) {
                        setBioOn(true);
                        setLockMsg("Biométricos listos. Al abrir se intentará Face ID / huella.");
                      } else {
                        setLockMsg(
                          "No se pudo registrar biométricos en este dispositivo. Usa la clave."
                        );
                      }
                    }}
                  >
                    {bioOn ? "Volver a registrar Face ID / huella" : "Activar Face ID / huella"}
                  </button>
                )}
                <button
                  type="button"
                  className="w-full min-h-[48px] rounded-xl border border-border text-sm font-medium"
                  onClick={() => {
                    lockNow();
                    window.location.reload();
                  }}
                >
                  Bloquear ahora
                </button>
                <button
                  type="button"
                  className="w-full min-h-[48px] rounded-xl border border-danger/40 text-danger text-sm font-medium"
                  onClick={() => {
                    if (confirm("¿Desactivar la clave de esta app en este dispositivo?")) {
                      disableLock();
                      setLockOn(false);
                      setBioOn(false);
                      setLockMsg("Clave desactivada");
                    }
                  }}
                >
                  Desactivar clave
                </button>
              </>
            )}
            {lockMsg && (
              <p className="text-xs text-muted text-center">{lockMsg}</p>
            )}
          </div>
        </section>

        {/* Tema */}
        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
            Apariencia
          </h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => onTheme(opt.key)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-secondary/40"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs text-muted">{opt.desc}</p>
                </div>
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    theme === opt.key
                      ? "border-primary bg-primary"
                      : "border-border"
                  }`}
                >
                  {theme === opt.key && (
                    <span className="w-2 h-2 rounded-full bg-primary-foreground" />
                  )}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Datos locales */}
        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
            Datos en este dispositivo
          </h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
            <button
              type="button"
              onClick={clearAlerts}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-secondary/40"
            >
              <span className="font-medium text-sm">Borrar alertas de precio</span>
              <span className="text-muted text-sm">›</span>
            </button>
            <button
              type="button"
              onClick={clearWatchlistHint}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-secondary/40"
            >
              <span className="font-medium text-sm">Lista de seguimiento y cartera</span>
              <span className="text-muted text-sm">›</span>
            </button>
          </div>
        </section>


        {/* Instalar */}
        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
            Instalar la app
          </h2>
          <div className="bg-card rounded-xl border border-border p-4 text-sm space-y-3 leading-relaxed">
            <div>
              <p className="font-medium">iPhone / iPad</p>
              <p className="text-xs text-muted mt-0.5">
                Safari → Compartir → Añadir a pantalla de inicio → Añadir
              </p>
            </div>
            <div>
              <p className="font-medium">Android</p>
              <p className="text-xs text-muted mt-0.5">
                Chrome → menú ⋮ → Instalar app (o Añadir a pantalla de inicio)
              </p>
            </div>
            <div>
              <p className="font-medium">Computadora</p>
              <p className="text-xs text-muted mt-0.5">
                Chrome/Edge → icono de instalar en la barra de direcciones
              </p>
            </div>
            <a href="/install" className="inline-block text-primary font-medium text-sm">
              Guía completa + enlace + código QR →
            </a>
          </div>
        </section>

        {/* Acerca de */}
        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
            Acerca de
          </h2>
          <div className="bg-card rounded-xl border border-border p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">App</span>
              <span className="font-medium">MX Cartera Global</span>
            </div>
            <p className="text-xs text-muted mt-2 leading-relaxed">
              Enfocada en inversionista en México: precios en pesos, SIC, FIBRAs,
              ISR estimado y W-8BEN. No somos casa de bolsa.
            </p>
            <div className="flex flex-col gap-2 mt-3 text-sm">
              <a href="/legal/terminos" className="text-primary">Términos de uso</a>
              <a href="/legal/privacidad" className="text-primary">Aviso de privacidad</a>
              <a href="/legal/aviso" className="text-primary">Aviso de no asesoría</a>
            </div>
            <p className="text-[11px] text-muted mt-3">
              Datos de mercado: proveedores terceros. Un plan de pago futuro
              exigirá licencias comerciales de esas APIs.
            </p>
            <div className="flex justify-between">
              <span className="text-muted">Versión</span>
              <span className="font-medium">0.1.0 MVP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Modelo</span>
              <span className="font-medium">100% gratuita</span>
            </div>
            <p className="text-xs text-muted pt-2 leading-relaxed">
              Datos de Finnhub, DataBursatil, FMP y Yahoo. La información es
              orientativa y no constituye asesoramiento financiero.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
