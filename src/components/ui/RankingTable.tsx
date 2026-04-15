"use client";

import { ReactNode, useMemo } from "react";
import { cn } from "@/lib/utils";

export interface RankingColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  format?: (v: unknown, row: T) => ReactNode;
  align?: "left" | "right";
  barKey?: string;
  mono?: boolean;
  width?: string;
}

interface RankingTableProps<T extends Record<string, unknown> = Record<string, unknown>> {
  columns: RankingColumn<T>[];
  data: T[];
  maxBarValue?: number;
  rowKey?: (row: T, i: number) => string;
  className?: string;
  showRank?: boolean;
}

export function RankingTable<T extends Record<string, unknown>>({
  columns,
  data,
  maxBarValue,
  rowKey,
  className,
  showRank = false,
}: RankingTableProps<T>) {
  const barMaxByKey = useMemo(() => {
    const map: Record<string, number> = {};
    columns.forEach((col) => {
      if (col.barKey) {
        const values = data
          .map((row) => Number(row[col.barKey as keyof T]))
          .filter((v) => Number.isFinite(v)) as number[];
        map[col.barKey] =
          maxBarValue ?? (values.length ? Math.max(...values) : 1);
      }
    });
    return map;
  }, [columns, data, maxBarValue]);

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border-subtle">
            {showRank ? (
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted w-10">
                #
              </th>
            ) : null}
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted",
                  col.align === "right" ? "text-right" : "text-left"
                )}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={rowKey ? rowKey(row, i) : String(i)}
              className="group border-b border-border-subtle/50 last:border-0 transition-colors hover:bg-bg-card-hover/50"
            >
              {showRank ? (
                <td className="px-3 py-3 text-text-muted num text-xs">
                  {i + 1}
                </td>
              ) : null}
              {columns.map((col) => {
                const v = row[col.key as keyof T];
                const content = col.format
                  ? col.format(v, row)
                  : (v as ReactNode);
                const numLike =
                  col.mono ||
                  col.align === "right" ||
                  typeof v === "number";
                return (
                  <td
                    key={col.key}
                    className={cn(
                      "px-3 py-3 align-middle",
                      col.align === "right" ? "text-right" : "text-left",
                      numLike && "font-mono num text-text-primary"
                    )}
                  >
                    {col.barKey ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span>{content}</span>
                        </div>
                        <div className="h-1 w-full rounded-full bg-bg-card-hover/60 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-accent-tempo transition-all duration-500"
                            style={{
                              width: `${Math.min(
                                100,
                                (Number(row[col.barKey as keyof T]) /
                                  (barMaxByKey[col.barKey] || 1)) *
                                  100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      content
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 ? (
        <div className="py-10 text-center text-sm text-text-muted">
          No data.
        </div>
      ) : null}
    </div>
  );
}
