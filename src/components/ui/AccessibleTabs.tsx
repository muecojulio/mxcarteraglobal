"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { HorizontalRail } from "@/components/ui/HorizontalRail";

type TabDefinition<Value extends string> = { value: Value; label: string };
type Indicator = { left: number; width: number };
type GestureStart = { id: number; x: number; y: number; time: number };

const SWIPE_EXCLUSIONS = [
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "summary",
  "[role='button']",
  "[role='tab']",
  "[contenteditable='true']",
  "[data-swipe-ignore]",
  ".ui-horizontal-rail",
  ".touch-none",
  "[role='map']",
].join(",");

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** Accessible, horizontally-scrollable tabs with roving keyboard focus and panel swipe. */
export function AccessibleTabs<Value extends string>({
  label,
  tabs,
  value,
  onChange,
  panels,
}: {
  label: string;
  tabs: readonly TabDefinition<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  panels: Record<Value, ReactNode>;
}) {
  const baseId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const tabRefs = useRef(new Map<Value, HTMLButtonElement>());
  const lastSelected = useRef<Value | null>(null);
  const gesture = useRef<GestureStart | null>(null);
  const exitTimer = useRef<number | null>(null);
  const [indicator, setIndicator] = useState<Indicator | null>(null);
  const [exitingValue, setExitingValue] = useState<Value | null>(null);

  useEffect(() => {
    const selectedTab = tabRefs.current.get(value);
    const list = selectedTab?.parentElement;
    if (!selectedTab || !list) return;

    const updateIndicator = () => {
      const current = tabRefs.current.get(value);
      if (!current) return;
      setIndicator({ left: current.offsetLeft, width: current.offsetWidth });
    };

    updateIndicator();
    if (lastSelected.current !== value) {
      const left = selectedTab.offsetLeft - (list.clientWidth - selectedTab.offsetWidth) / 2;
      list.scrollTo({ left: Math.max(0, left), behavior: prefersReducedMotion() ? "auto" : "smooth" });
      lastSelected.current = value;
    }

    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateIndicator);
    resizeObserver?.observe(list);
    tabs.forEach((tab) => {
      const node = tabRefs.current.get(tab.value);
      if (node) resizeObserver?.observe(node);
    });
    return () => resizeObserver?.disconnect();
  }, [value, tabs]);

  useEffect(() => () => {
    if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
  }, []);

  const selectTab = (nextValue: Value) => {
    if (nextValue === value) return;
    setExitingValue(value);
    if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    const reducedMotion = prefersReducedMotion();
    exitTimer.current = window.setTimeout(() => {
      setExitingValue(null);
      exitTimer.current = null;
    }, reducedMotion ? 0 : 220);
    onChange(nextValue);
  };

  const focusAndSelect = (index: number) => {
    const next = tabs[index];
    if (!next) return;
    selectTab(next.value);
    tabRefs.current.get(next.value)?.focus();
  };

  const onTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex == null) return;
    event.preventDefault();
    focusAndSelect(nextIndex);
  };

  const onPanelPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch" || !event.isPrimary) return;
    const target = event.target;
    if (target instanceof Element && target.closest(SWIPE_EXCLUSIONS)) return;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp };
  };

  const onPanelPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    gesture.current = null;
    if (event.pointerType !== "touch" || tabs.length < 2) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const elapsed = Math.max(1, event.timeStamp - start.time);
    const distance = Math.abs(dx);
    const clearlyHorizontal = distance > Math.abs(dy) * 1.2;
    const longEnough = distance >= 48 || (distance >= 26 && distance / elapsed >= 0.55);
    if (!clearlyHorizontal || !longEnough) return;

    const currentIndex = tabs.findIndex((tab) => tab.value === value);
    const nextIndex = currentIndex + (dx < 0 ? 1 : -1);
    if (nextIndex >= 0 && nextIndex < tabs.length) selectTab(tabs[nextIndex].value);
  };

  return (
    <div className="ui-tabs">
      <HorizontalRail ariaLabel={label} role="tablist" orientation="horizontal" scrollerClassName="ui-tab-list">
        {tabs.map((tab, index) => (
          <button
            key={tab.value}
            ref={(node) => {
              if (node) tabRefs.current.set(tab.value, node);
              else tabRefs.current.delete(tab.value);
            }}
            id={`${baseId}-tab-${tab.value}`}
            type="button"
            role="tab"
            aria-selected={value === tab.value}
            aria-controls={`${baseId}-panel-${tab.value}`}
            tabIndex={value === tab.value ? 0 : -1}
            className="ui-tab"
            onClick={() => selectTab(tab.value)}
            onKeyDown={(event) => onTabKeyDown(event, index)}
          >
            {tab.label}
          </button>
        ))}
        <span
          className={`ui-tab-indicator${indicator ? " is-ready" : ""}`}
          style={indicator ? { width: indicator.width, transform: `translateX(${indicator.left}px)` } : undefined}
          aria-hidden="true"
        />
      </HorizontalRail>

      <div className="ui-tab-panels">
        {tabs.map((tab) => {
          const active = value === tab.value;
          const exiting = exitingValue === tab.value && !active;
          const visible = active || exiting;
          return (
            <div
              key={tab.value}
              id={`${baseId}-panel-${tab.value}`}
              role="tabpanel"
              aria-labelledby={`${baseId}-tab-${tab.value}`}
              aria-hidden={!active}
              hidden={!visible}
              inert={!active}
              tabIndex={active ? 0 : -1}
              className={`ui-tab-panel${active ? " is-active" : exiting ? " is-exiting" : ""}`}
              onPointerDown={active ? onPanelPointerDown : undefined}
              onPointerUp={active ? onPanelPointerUp : undefined}
              onPointerCancel={active ? () => { gesture.current = null; } : undefined}
            >
              {visible ? panels[tab.value] : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
