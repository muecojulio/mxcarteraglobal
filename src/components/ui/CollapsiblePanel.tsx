"use client";

import type { ReactNode } from "react";

/** Keeps collapsed content out of both the tab order and the accessibility tree. */
export function CollapsiblePanel({
  id,
  labelledBy,
  open,
  className = "",
  children,
}: {
  id: string;
  labelledBy: string;
  open: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      role="region"
      aria-labelledby={labelledBy}
      aria-hidden={!open}
      inert={!open}
      className={`ui-disclosure${open ? " is-open" : ""}`}
    >
      <div className="ui-disclosure__clip">
        <div className={className}>{children}</div>
      </div>
    </div>
  );
}
