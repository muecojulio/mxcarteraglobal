"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { hydrateVaultPersist, saveLastRoute } from "@/lib/persist";
import { ensureDeviceVault } from "@/lib/crypto-vault";
import { isLockEnabled, isUnlockedThisSession } from "@/lib/app-lock";

/** Guarda la última ruta y abre el cifrado local si se puede */
export default function PersistRoute() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) saveLastRoute(pathname);
  }, [pathname]);

  useEffect(() => {
    if (isLockEnabled() && !isUnlockedThisSession()) return;
    void (async () => {
      try {
        await ensureDeviceVault();
        await hydrateVaultPersist();
      } catch {
        /* */
      }
    })();
  }, []);
  return null;
}
