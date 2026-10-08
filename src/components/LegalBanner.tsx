"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "mxcg_legal_banner_v1";

/**
 * Aviso legal visible y claro: no asesoría, no casa de bolsa, datos orientativos.
 */
export default function LegalBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) !== "1") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pointer-events-none"
      role="status"
    >
      <div className="max-w-lg mx-auto pointer-events-auto rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-lg p-3.5">
        <p className="text-xs font-semibold text-foreground mb-1">
          Aviso importante
        </p>
        <p className="text-[11px] text-muted leading-relaxed">
          <strong className="text-foreground font-medium">MX Cartera Global</strong>{" "}
          es solo una herramienta de seguimiento.{" "}
          <strong className="text-foreground font-medium">No</strong> somos casa
          de bolsa, <strong className="text-foreground font-medium">no</strong>{" "}
          estamos autorizados por la CNBV como asesores y{" "}
          <strong className="text-foreground font-medium">no</strong> ejecutamos
          órdenes. Precios, dividendos, impuestos y “contexto de precio” son
          orientativos; puedes perder dinero. Confirma con tu intermediario y
          contador.
        </p>
        <div className="flex items-center gap-2 mt-2.5">
          <Link
            href="/legal/aviso"
            className="text-[11px] font-medium text-primary"
          >
            Leer aviso completo
          </Link>
          <Link href="/legal" className="text-[11px] text-muted">
            Términos
          </Link>
          <Link href="/legal/privacidad" className="text-[11px] text-muted">
            Privacidad
          </Link>
          <button
            type="button"
            className="ml-auto text-[11px] font-semibold px-3 py-1.5 rounded-full bg-primary text-primary-foreground"
            onClick={() => {
              try {
                localStorage.setItem(KEY, "1");
              } catch {
                /* */
              }
              setOpen(false);
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
