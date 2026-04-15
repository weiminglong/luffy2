"use client";

import { TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeltaBadgeProps {
  /**
   * Percent change. Pass `null` or `undefined` for "no data".
   * Special semantics: pass `Infinity` to render "New" (value existed before → 0, now → positive).
   */
  value: number | null | undefined;
  suffix?: string;
  inverse?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const CAP = 999;

export function DeltaBadge({
  value,
  suffix = "%",
  inverse = false,
  size = "sm",
  className,
}: DeltaBadgeProps) {
  const sizeCls =
    size === "md"
      ? "px-2.5 py-1 text-[13px] gap-1.5"
      : "px-2 py-0.5 text-xs gap-1";
  const iconCls = size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";

  // Null / non-numeric → dash
  if (value === null || value === undefined || Number.isNaN(value)) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full font-medium num bg-bg-card-hover text-text-muted",
          sizeCls,
          className
        )}
      >
        —
      </span>
    );
  }

  // Infinity → "New" badge (baseline was 0)
  if (!Number.isFinite(value)) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full font-semibold bg-accent-positive/15 text-accent-positive",
          sizeCls,
          className
        )}
      >
        <Sparkles className={cn(iconCls)} aria-hidden />
        <span>New</span>
      </span>
    );
  }

  if (value === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full font-medium num bg-bg-card-hover text-text-muted",
          sizeCls,
          className
        )}
      >
        <span>0{suffix}</span>
      </span>
    );
  }

  const rawPositive = value > 0;
  const isGood = inverse ? !rawPositive : rawPositive;

  const Icon = rawPositive ? TrendingUp : TrendingDown;
  const style = isGood
    ? "bg-accent-positive/15 text-accent-positive"
    : "bg-accent-negative/15 text-accent-negative";

  const abs = Math.abs(value);
  const sign = rawPositive ? "+" : "-";
  const display =
    abs >= CAP
      ? `${sign}${CAP}+${suffix}`
      : `${rawPositive ? "+" : ""}${value.toFixed(1)}${suffix}`;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold num",
        sizeCls,
        style,
        className
      )}
    >
      <Icon className={cn(iconCls)} aria-hidden />
      <span>{display}</span>
    </span>
  );
}
