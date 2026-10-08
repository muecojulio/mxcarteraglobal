"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isLockEnabled, hasRecoveryCode } from "@/lib/app-lock";
import { loadPositions, loadWatchlist } from "@/lib/persist";

const RECOVERY_SAVED = "mxcg_recovery_saved";
const LAST_BACKUP = "mxcg_last_backup_at";
const DISMISS = "mxcg_sec_banner_dismiss";
const BACKUP_DAYS = 14;

export function markRecoverySaved() {
  try {
    localStorage.setItem(RECOVERY_SAVED, "1");
  } catch {
    /* */
  }
}

export function markBackupDone() {
  try {
    localStorage.setItem(LAST_BACKUP, new Date().toISOString());
  } catch {
    /* */
  }
}

export function SecurityOnboarding() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState<"pin" | "recovery" | "backup" | null>(null);

  useEffect(() => {
    try {
      const dismissUntil = Number(localStorage.getItem(DISMISS) || "0");
      if (Date.now() < dismissUntil) return;

      const lock = isLockEnabled();
      const recoveryOk =
        localStorage.getItem(RECOVERY_SAVED) === "1" || !hasRecoveryCode();
      const last = localStorage.getItem(LAST_BACKUP);
      const days = last
        ? (Date.now() - new Date(last).getTime()) / (86400000)
        : 999;
      const hasData =
        loadPositions().length > 0 || loadWatchlist().length > 0;

      if (!lock) {
        setStep("pin");
        setShow(true);
        return;
      }
      if (hasRecoveryCode() && !recoveryOk) {
        setStep("recovery");
        setShow(true);
        return;
      }
      if (hasData && days >= BACKUP_DAYS) {
        setStep("backup");
        setShow(true);
      }
    } catch {
      /* */
    }
  }, []);

  if (!show || !step) return null;

  const dismissWeek = () => {
    localStorage.setItem(DISMISS, String(Date.now() + 7 * 86400000));
    setShow(false);
  };

  const titles = {
    pin: "Protege tu cartera",
    recovery: "Guarda tu código de recuperación",
    backup: "Haz un backup de vez en cuando",
  };

  const bodies = {
    pin: "Activa un NIP al abrir la app. Así nadie ve tu cartera solo con el teléfono desbloqueado.",
    recovery:
      "Si olvidas el NIP, solo el código de recuperación te deja poner uno nuevo. Anótalo fuera del teléfono.",
    backup:
      "Exporta un archivo JSON cada dos semanas (o al cambiar de iPhone). Tarda un minuto y evita perder la cartera.",
  };

  return (
    <div className="fixed inset-x-0 bottom-20 z-[60] px-3 pointer-events-none">
      <div className="max-w-lg mx-auto pointer-events-auto bg-card border border-border rounded-2xl shadow-lg p-4 space-y-3">
        <p className="text-sm font-bold">{titles[step]}</p>
        <p className="text-xs text-muted leading-relaxed">{bodies[step]}</p>
        <div className="flex gap-2">
          <Link
            href="/settings"
            className="flex-1 min-h-[44px] rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center"
            onClick={() => setShow(false)}
          >
            Ir a Configuración
          </Link>
          <button
            type="button"
            onClick={dismissWeek}
            className="min-h-[44px] px-3 rounded-xl border border-border text-xs text-muted"
          >
            Luego
          </button>
        </div>
      </div>
    </div>
  );
}
