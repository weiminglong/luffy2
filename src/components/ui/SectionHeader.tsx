"use client";

import { useState, ReactNode } from "react";
import { Link as LinkIcon, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRangeStore } from "@/lib/store";

type Accent = "tempo" | "positive" | "stablecoin" | "negative";

const ACCENT_COLOR: Record<Accent, string> = {
  tempo: "#6C5CE7",
  positive: "#00CEC9",
  stablecoin: "#2ED573",
  negative: "#FD7272",
};

interface SectionHeaderProps {
  id: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  accent?: Accent;
  /** If true, shows the active global time range as a pill on the right. */
  showRange?: boolean;
  className?: string;
}

export function SectionHeader({
  id,
  eyebrow,
  title,
  subtitle,
  action,
  accent = "tempo",
  showRange = true,
  className,
}: SectionHeaderProps) {
  const [copied, setCopied] = useState(false);
  const range = useRangeStore((s) => s.range);

  const copyLink = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => undefined);
  };

  const color = ACCENT_COLOR[accent];

  return (
    <header
      id={id}
      className={cn(
        "group flex flex-wrap items-end justify-between gap-4 scroll-mt-24",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-3 flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
              style={{
                color,
                borderColor: `${color}55`,
                backgroundColor: `${color}14`,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: color }}
                aria-hidden
              />
              {eyebrow}
            </span>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <h2 className="font-display text-[32px] md:text-[34px] leading-tight font-semibold tracking-tight text-text-primary">
            {title}
          </h2>
          <button
            type="button"
            aria-label={`Copy link to ${title}`}
            onClick={copyLink}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-full border border-border-subtle text-text-muted opacity-0 transition-opacity hover:text-text-primary group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-tempo"
            )}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-accent-positive" />
            ) : (
              <LinkIcon className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        {/* Gradient underline */}
        <div
          aria-hidden
          className="mt-2 h-[2px] w-14 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${color}, ${color}00)`,
          }}
        />
        {subtitle ? (
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-text-secondary">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {showRange ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-card px-2.5 py-1 text-[11px] font-medium text-text-secondary tabular-nums">
            <span className="text-text-muted">Range</span>
            <span className="text-text-primary tracking-wider">
              {range === "7d" ? "Weekly" : range === "all" ? "Since Launch" : range.toUpperCase()}
            </span>
          </span>
        ) : null}
        {action ?? null}
      </div>
    </header>
  );
}
