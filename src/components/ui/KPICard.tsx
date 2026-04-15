"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { animate, useMotionValue } from "framer-motion";
import { cn } from "@/lib/utils";
import { DeltaBadge } from "./DeltaBadge";
import { Sparkline } from "../charts/Sparkline";

type Variant = "hero" | "section" | "compact";
type Accent = "tempo" | "positive" | "negative" | "stablecoin";

interface KPICardProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  deltaInverse?: boolean;
  sparkline?: number[];
  variant?: Variant;
  icon?: ReactNode;
  accent?: Accent;
  format?: (n: number) => string;
  className?: string;
}

const ACCENT_COLOR: Record<Accent, string> = {
  tempo: "#6C5CE7",
  positive: "#00CEC9",
  negative: "#FD7272",
  stablecoin: "#2ED573",
};

function AnimatedNumber({
  value,
  format,
}: {
  value: number;
  format: (n: number) => string;
}) {
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(() => format(0));
  const prev = useRef(0);

  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1], // ease-out cubic
      onUpdate: (latest) => {
        setDisplay(format(latest));
      },
    });
    prev.current = value;
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{display}</>;
}

export function KPICard({
  label,
  value,
  delta,
  deltaLabel,
  deltaInverse = false,
  sparkline,
  variant = "section",
  icon,
  accent = "tempo",
  format,
  className,
}: KPICardProps) {
  const isNumeric = typeof value === "number" && Number.isFinite(value);
  const formatter = format ?? ((n: number) => n.toLocaleString());
  const color = ACCENT_COLOR[accent];

  const valueSizes: Record<Variant, string> = {
    hero: "text-[64px] leading-[1.05]",
    section: "text-[36px] leading-[1.1]",
    compact: "text-[24px] leading-[1.15]",
  };

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "card card-hover relative rounded-2xl border border-border-subtle p-4 pl-[14px] flex items-center justify-between gap-3 overflow-hidden",
          className
        )}
      >
        <span
          aria-hidden
          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
          style={{ backgroundColor: color, opacity: 0.85 }}
        />
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {icon ? (
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor: `${color}1A`,
                color,
              }}
              aria-hidden
            >
              {icon}
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium uppercase tracking-wider text-text-secondary truncate">
              {label}
            </div>
            <div
              className={cn(
                "font-display font-semibold text-text-primary num mt-0.5 truncate",
                "text-[22px] leading-[1.15]"
              )}
            >
              {isNumeric ? (
                <AnimatedNumber value={value as number} format={formatter} />
              ) : (
                value
              )}
            </div>
          </div>
        </div>
        {delta !== undefined ? (
          <DeltaBadge value={delta} inverse={deltaInverse} />
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "card card-hover relative overflow-hidden rounded-2xl border border-border-subtle p-6",
        variant === "hero" && "bg-gradient-card",
        className
      )}
    >
      {variant === "hero" ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-40 blur-3xl"
            style={{ backgroundColor: color }}
          />
          <span
            aria-hidden
            className="absolute left-0 top-6 bottom-6 w-[3px] rounded-full"
            style={{ backgroundColor: color }}
          />
        </>
      ) : null}

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {icon ? (
              <span style={{ color }} aria-hidden>
                {icon}
              </span>
            ) : null}
            <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              {label}
            </div>
          </div>

          <div
            className={cn(
              "font-display font-bold text-text-primary num mt-3 tabular-nums",
              valueSizes[variant]
            )}
          >
            {isNumeric ? (
              <AnimatedNumber value={value as number} format={formatter} />
            ) : (
              value
            )}
          </div>

          {(delta !== undefined || deltaLabel) && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              {delta !== undefined ? (
                <DeltaBadge
                  value={delta}
                  inverse={deltaInverse}
                  size={variant === "hero" ? "md" : "sm"}
                />
              ) : null}
              {deltaLabel ? (
                <span className="text-xs text-text-muted">{deltaLabel}</span>
              ) : null}
            </div>
          )}
        </div>

        {sparkline && sparkline.length > 0 ? (
          <div className="shrink-0">
            <Sparkline
              data={sparkline}
              color={color}
              type="area"
              width={variant === "hero" ? 110 : 72}
              height={variant === "hero" ? 44 : 28}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
