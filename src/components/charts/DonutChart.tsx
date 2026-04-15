"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface DonutDatum {
  name: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  data: DonutDatum[];
  valueFormatter?: (n: number) => string;
  centerLabel?: string;
  centerValue?: string;
  height?: number;
  className?: string;
}

const DEFAULT_PALETTE = [
  "#6C5CE7",
  "#00CEC9",
  "#2ED573",
  "#FFA801",
  "#FD7272",
  "#627EEA",
  "#9945FF",
  "#28A0F0",
];

function Tip({
  active,
  payload,
  valueFormatter,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: DonutDatum & { fill: string } }>;
  valueFormatter?: (n: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0];
  return (
    <div className="glass rounded-xl border border-border-strong px-3 py-2 text-xs shadow-xl">
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: p.payload.fill }}
          aria-hidden
        />
        <span className="text-text-primary font-medium">{p.name}</span>
      </div>
      <div className="num mt-1 text-text-secondary">
        {valueFormatter ? valueFormatter(p.value) : p.value}
      </div>
    </div>
  );
}

export function DonutChart({
  data,
  valueFormatter = (n) => n.toLocaleString(),
  centerLabel,
  centerValue,
  height = 240,
  className,
}: DonutChartProps) {
  const total = useMemo(
    () => data.reduce((s, d) => s + d.value, 0) || 1,
    [data]
  );

  const enriched = useMemo(
    () =>
      data.map((d, i) => ({
        ...d,
        fill: d.color ?? DEFAULT_PALETTE[i % DEFAULT_PALETTE.length],
      })),
    [data]
  );

  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-6",
        className
      )}
    >
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={enriched}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive
            >
              {enriched.map((e) => (
                <Cell key={e.name} fill={e.fill} />
              ))}
            </Pie>
            <Tooltip content={<Tip valueFormatter={valueFormatter} />} />
          </PieChart>
        </ResponsiveContainer>
        {(centerLabel || centerValue) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerLabel ? (
              <div className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
                {centerLabel}
              </div>
            ) : null}
            {centerValue ? (
              <div className="font-display text-2xl font-semibold text-text-primary num mt-1">
                {centerValue}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <ul className="space-y-2 text-sm md:min-w-[180px]">
        {enriched.map((e) => {
          const pct = (e.value / total) * 100;
          return (
            <li key={e.name} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-text-secondary min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ background: e.fill }}
                  aria-hidden
                />
                <span className="truncate text-text-primary">{e.name}</span>
              </span>
              <span className="text-right">
                <span className="num font-medium text-text-primary block">
                  {valueFormatter(e.value)}
                </span>
                <span className="num text-[11px] text-text-muted">
                  {pct.toFixed(1)}%
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
