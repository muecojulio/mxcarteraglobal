"use client";

import { type ReactNode, useId, useRef, useState } from "react";

const excluded = "button,a,input,select,textarea,summary,[role='button'],[role='tab'],[role='switch'],[role='slider'],[role='combobox'],[contenteditable],[data-swipe-ignore],.ui-horizontal-rail";
const width = 104;

/** Optional touch shortcut; the explicit disclosure remains available at every size. */
export function SwipeActions({ label, children, actions }: { label: string; children: ReactNode; actions: ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState<number | null>(null);
  const dragged = useRef(false);
  const start = useRef<{ id: number; x: number; y: number; time: number; origin: number; axis: "x" | null } | null>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  return <div className="ui-swipe" data-swipe-ignore onKeyDown={(event) => {
    if (event.key === "Escape" && open) { setOpen(false); toggle.current?.focus(); }
  }}>
    <div className="ui-swipe__viewport">
      <div id={id} className="ui-swipe__actions" inert={!open} aria-hidden={!open}>{actions}</div>
      <div className="ui-swipe__content" style={{ transform: `translateX(${offset ?? (open ? -width : 0)}px)`, transition: offset === null ? undefined : "none" }}
        onPointerDown={(event) => {
          start.current = null; dragged.current = false;
          const control = (event.target as Element).closest(excluded);
          if (event.pointerType !== "touch" || !event.isPrimary || (control && event.currentTarget.contains(control))) return;
          start.current = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp, origin: open ? -width : 0, axis: null };
        }}
        onPointerMove={(event) => {
          const gesture = start.current;
          if (!gesture || gesture.id !== event.pointerId) return;
          const dx = event.clientX - gesture.x;
          const dy = event.clientY - gesture.y;
          if (!gesture.axis) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 10) return;
            if (Math.abs(dx) <= Math.abs(dy) * 1.2) { start.current = null; return; }
            gesture.axis = "x";
            event.currentTarget.setPointerCapture(event.pointerId);
          }
          dragged.current = true;
          setOffset(Math.max(-width, Math.min(0, gesture.origin + dx)));
        }}
        onPointerUp={(event) => {
          const gesture = start.current;
          start.current = null;
          setOffset(null);
          if (!gesture || gesture.id !== event.pointerId || !gesture.axis) return;
          const dx = event.clientX - gesture.x;
          const fast = Math.abs(dx) >= 26 && Math.abs(dx) / Math.max(1, event.timeStamp - gesture.time) > .55;
          setOpen(fast ? dx < 0 : gesture.origin + dx < -width / 2);
        }}
        onPointerCancel={() => { start.current = null; setOffset(null); }}
        onClickCapture={(event) => {
          if (dragged.current && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); dragged.current = false; }
        }}
      >{children}</div>
    </div>
    <button ref={toggle} type="button" className="ui-swipe__toggle" aria-expanded={open} aria-controls={id} aria-label={`${open ? "Cerrar" : "Mostrar"} acciones de ${label}`} onClick={() => setOpen(!open)}>{open ? "Cerrar acciones" : "Acciones"}</button>
  </div>;
}
