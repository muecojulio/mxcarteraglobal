"use client";

import { useEffect, useRef } from "react";
import { HorizontalRail } from "@/components/ui/HorizontalRail";

type ChipOption<Value extends string> = {
  value: Value;
  label: string;
  disabled?: boolean;
};

type ScrollableChipsProps<Value extends string> = {
  label: string;
  options: readonly ChipOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  disabled?: boolean;
};

/** A labelled, keyboard-friendly filter group that keeps the chosen chip in view. */
export function ScrollableChips<Value extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: ScrollableChipsProps<Value>) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const selected = selectedRef.current;
    if (!selected) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const rail = selected.parentElement;
    rail?.scrollTo({ left: selected.offsetLeft - (rail.clientWidth - selected.offsetWidth) / 2, behavior: reduceMotion ? "auto" : "smooth" });
  }, [value]);

  return (
    <HorizontalRail ariaLabel={label} scrollerClassName="ui-chip-rail">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={active ? selectedRef : undefined}
            type="button"
            className={`ui-chip${active ? " ui-chip-active" : ""}`}
            aria-pressed={active}
            disabled={disabled || option.disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </HorizontalRail>
  );
}
