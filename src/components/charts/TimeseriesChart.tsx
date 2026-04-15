"use client";

import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface Series {
  key: string;
  label: string;
  color: string;
  type?: "line" | "area" | "bar";
}

interface TimeseriesChartProps {
  data: Array<Record<string, unknown>>;
  xKey: string;
  series: Series[];
  height?: number;
  stackId?: string;
  yFormatter?: (n: number) => string;
  xFormatter?: (s: string) => string;
  showLegend?: boolean;
  className?: string;
}

interface TooltipPayloadItem {
  value: number;
  color: string;
  dataKey: string;
  name?: string;
}

function CustomTooltip({
  active,
  payload,
  label,
  yFormatter,
  xFormatter,
  seriesMap,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  yFormatter?: (n: number) => string;
  xFormatter?: (s: string) => string;
  seriesMap: Record<string, Series>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className="glass rounded-xl border border-border-strong px-3 py-2 text-xs shadow-xl"
      style={{ minWidth: 160 }}
    >
      <div className="text-text-muted mb-1.5 font-medium">
        {xFormatter && label ? xFormatter(label) : label}
      </div>
      <div className="space-y-1">
        {payload.map((item) => {
          const meta = seriesMap[item.dataKey];
          return (
            <div
              key={item.dataKey}
              className="flex items-center justify-between gap-4"
            >
              <span className="flex items-center gap-2 text-text-secondary">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: item.color }}
                  aria-hidden
                />
                {meta?.label ?? item.name ?? item.dataKey}
              </span>
              <span className="num font-medium text-text-primary">
                {yFormatter ? yFormatter(item.value) : item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TimeseriesChart({
  data,
  xKey,
  series,
  height = 280,
  stackId,
  yFormatter,
  xFormatter,
  showLegend = false,
  className,
}: TimeseriesChartProps) {
  const seriesMap = useMemo(
    () => Object.fromEntries(series.map((s) => [s.key, s])),
    [series]
  );

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
        >
          <defs>
            {series
              .filter((s) => (s.type ?? "line") === "area")
              .map((s) => (
                <linearGradient
                  key={`grad-${s.key}`}
                  id={`grad-${s.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
          </defs>

          <CartesianGrid
            stroke="#1E2030"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey={xKey}
            stroke="#5A5C70"
            tick={{ fill: "#5A5C70", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={xFormatter}
            minTickGap={24}
          />
          <YAxis
            stroke="#5A5C70"
            tick={{ fill: "#5A5C70", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={yFormatter}
            width={56}
          />
          <Tooltip
            cursor={{ stroke: "#2A2D42", strokeDasharray: "3 3" }}
            content={
              <CustomTooltip
                yFormatter={yFormatter}
                xFormatter={xFormatter}
                seriesMap={seriesMap}
              />
            }
          />
          {showLegend ? (
            <Legend
              wrapperStyle={{ fontSize: 12, color: "#8B8D9E" }}
              iconType="circle"
            />
          ) : null}

          {series.map((s) => {
            const t = s.type ?? "line";
            if (t === "area") {
              return (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  fill={`url(#grad-${s.key})`}
                  stackId={stackId}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  isAnimationActive
                />
              );
            }
            if (t === "bar") {
              return (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  fill={s.color}
                  radius={[4, 4, 0, 0]}
                  stackId={stackId}
                  maxBarSize={24}
                  isAnimationActive
                />
              );
            }
            return (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                isAnimationActive
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
