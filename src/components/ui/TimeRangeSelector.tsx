"use client";

import { cn } from "@/lib/utils";

interface TimeRangeSelectorProps {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

const OPTIONS: Array<{ value: string; label: string }> = [
  { value: "7d", label: "Weekly" },
  { value: "all", label: "Since Launch" },
];

export function TimeRangeSelector({
  value,
  onChange,
  className,
}: TimeRangeSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Time range"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border-subtle bg-bg-card p-1",
        className
      )}
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative rounded-full px-3.5 py-1 text-xs font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-tempo focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary",
              active
                ? "bg-accent-tempo text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
