"use client";

import { cn } from "@/lib/utils";

interface TimeRangeSelectorProps {
  value: string;
  onChange: (v: string) => void;
  ranges?: string[];
  className?: string;
}

const DEFAULT_RANGES = ["7d", "30d", "90d", "1y"];

export function TimeRangeSelector({
  value,
  onChange,
  ranges = DEFAULT_RANGES,
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
      {ranges.map((r) => {
        const active = r === value;
        return (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(r)}
            className={cn(
              "relative rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-tempo focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary",
              active
                ? "bg-accent-tempo text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {r.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
