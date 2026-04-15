"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeltaBadgeProps {
  value: number | null | undefined;
  suffix?: string;
  inverse?: boolean;
  className?: string;
}

export function DeltaBadge({
  value,
  suffix = "%",
  inverse = false,
  className,
}: DeltaBadgeProps) {
  const isZeroOrNull =
    value === null ||
    value === undefined ||
    !Number.isFinite(value) ||
    value === 0;

  const rawPositive = (value ?? 0) > 0;
  const isGood = inverse ? !rawPositive : rawPositive;

  let Icon = Minus;
  let style = "bg-bg-card-hover text-text-muted";
  let sign = "";

  if (!isZeroOrNull) {
    if (isGood) {
      Icon = rawPositive ? TrendingUp : TrendingDown;
      style = "bg-accent-positive/10 text-accent-positive";
    } else {
      Icon = rawPositive ? TrendingUp : TrendingDown;
      style = "bg-accent-negative/10 text-accent-negative";
    }
    sign = rawPositive ? "+" : "";
  }

  const display = isZeroOrNull
    ? "—"
    : `${sign}${(value as number).toFixed(1)}${suffix}`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium num",
        style,
        className
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      <span>{display}</span>
    </span>
  );
}
