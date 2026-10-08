"use client";

import {
  type AriaRole,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type HorizontalRailProps = {
  children: ReactNode;
  ariaLabel: string;
  className?: string;
  scrollerClassName?: string;
  role?: AriaRole;
  orientation?: "horizontal" | "vertical";
};

type OverflowEdges = { start: boolean; end: boolean };

/** A native, momentum-scrolling rail with edge hints that only appear when content overflows. */
export function HorizontalRail({
  children,
  ariaLabel,
  className = "",
  scrollerClassName = "",
  role = "group",
  orientation,
}: HorizontalRailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const draggedRef = useRef(false);
  const [edges, setEdges] = useState<OverflowEdges>({ start: false, end: false });

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const next = { start: el.scrollLeft > 1, end: maxScroll - el.scrollLeft > 1 };
    setEdges((current) => current.start === next.start && current.end === next.end ? current : next);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });

    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    resizeObserver?.observe(el);
    Array.from(el.children).forEach((child) => resizeObserver?.observe(child));

    const mutationObserver = typeof MutationObserver === "undefined" ? null : new MutationObserver(() => {
      measure();
      Array.from(el.children).forEach((child) => resizeObserver?.observe(child));
    });
    mutationObserver?.observe(el, { childList: true, characterData: true, subtree: true });

    return () => {
      el.removeEventListener("scroll", measure);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [children, measure]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    pointerRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    draggedRef.current = false;
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = pointerRef.current;
    if (!start || start.id !== event.pointerId) return;
    if (Math.abs(event.clientX - start.x) > 8 || Math.abs(event.clientY - start.y) > 8) draggedRef.current = true;
  };

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerRef.current?.id !== event.pointerId) return;
    pointerRef.current = null;
    // The browser dispatches click immediately after pointerup. Keep the drag flag through that event.
    window.setTimeout(() => { draggedRef.current = false; }, 80);
  };

  const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!draggedRef.current || event.detail === 0) return;
    event.preventDefault();
    event.stopPropagation();
    draggedRef.current = false;
  };

  return (
    <div className={`ui-horizontal-rail ${className}`}>
      <div
        ref={scrollerRef}
        className={`ui-horizontal-rail__scroller ${scrollerClassName}`}
        role={role}
        tabIndex={role !== "tablist" && (edges.start || edges.end) ? 0 : undefined}
        aria-label={ariaLabel}
        aria-orientation={orientation}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
      {edges.start ? <span className="ui-horizontal-rail__fade ui-horizontal-rail__fade--start" aria-hidden="true" /> : null}
      {edges.end ? <span className="ui-horizontal-rail__fade ui-horizontal-rail__fade--end" aria-hidden="true" /> : null}
    </div>
  );
}
