"use client";

import type { ButtonHTMLAttributes } from "react";

/** Controlled state: outcomes remain owned by the existing business operation. */
export function ActionButton({ busy = false, busyLabel = "Procesando…", children, disabled, ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; busyLabel?: string }) {
  return <button {...props} disabled={disabled || busy} aria-busy={busy}>
    {busy ? busyLabel : children}
  </button>;
}
