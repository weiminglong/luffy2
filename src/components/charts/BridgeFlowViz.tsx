"use client";

import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BridgeFlowDatum {
  token_symbol: string;
  inflow_usd: number;
  outflow_usd: number;
  net_flow_usd: number;
}

interface BridgeFlowVizProps {
  data: BridgeFlowDatum[];
  valueFormatter?: (n: number) => string;
  colorForToken?: (symbol: string) => string;
  className?: string;
}

export function BridgeFlowViz({
  data,
  valueFormatter = (n) => n.toLocaleString(),
  colorForToken = () => "#6C5CE7",
  className,
}: BridgeFlowVizProps) {
  if (!data || data.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-text-muted">
        No bridge flow data.
      </div>
    );
  }

  // Share-based sizing across all flows.
  const max = Math.max(
    ...data.flatMap((d) => [Math.abs(d.inflow_usd), Math.abs(d.outflow_usd)]),
    1
  );

  return (
    <div className={cn("grid gap-3 md:grid-cols-2 lg:grid-cols-3", className)}>
      {data.map((d, idx) => {
        const color = colorForToken(d.token_symbol);
        const inPct = Math.max(2, (d.inflow_usd / max) * 100);
        const outPct = Math.max(2, (d.outflow_usd / max) * 100);
        const net = d.net_flow_usd;
        const NetIcon =
          net > 0 ? ArrowRight : net < 0 ? ArrowLeft : Minus;
        const netClass =
          net > 0
            ? "text-accent-positive"
            : net < 0
              ? "text-accent-negative"
              : "text-text-muted";

        return (
          <div
            key={d.token_symbol}
            className="rounded-2xl border border-border-subtle bg-bg-card/50 p-4 space-y-3 hover:border-border-strong transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
                <span className="font-semibold text-text-primary tracking-tight">
                  {d.token_symbol}
                </span>
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                  net === 0 ? "bg-bg-card-hover" : "",
                  netClass
                )}
                style={
                  net !== 0
                    ? {
                        backgroundColor: `${
                          net > 0 ? "#00CEC9" : "#FD7272"
                        }1A`,
                      }
                    : undefined
                }
              >
                <NetIcon className="h-3 w-3" aria-hidden />
                Net {valueFormatter(Math.abs(net))}
              </span>
            </div>

            <div className="space-y-2">
              <FlowRow
                label="Inflow"
                sublabel="External → Tempo"
                value={d.inflow_usd}
                pct={inPct}
                color="#2ED573"
                valueFormatter={valueFormatter}
                direction="in"
                delay={idx * 0.05}
              />
              <FlowRow
                label="Outflow"
                sublabel="Tempo → External"
                value={d.outflow_usd}
                pct={outPct}
                color="#FD7272"
                valueFormatter={valueFormatter}
                direction="out"
                delay={idx * 0.05 + 0.05}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FlowRow({
  label,
  sublabel,
  value,
  pct,
  color,
  valueFormatter,
  direction,
  delay,
}: {
  label: string;
  sublabel: string;
  value: number;
  pct: number;
  color: string;
  valueFormatter: (n: number) => string;
  direction: "in" | "out";
  delay: number;
}) {
  const Icon = direction === "in" ? ArrowRight : ArrowLeft;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <div className="flex items-center gap-1.5">
          <Icon
            className="h-3 w-3"
            style={{ color }}
            aria-hidden
          />
          <span className="text-text-secondary font-medium">{label}</span>
          <span className="text-text-muted hidden sm:inline">· {sublabel}</span>
        </div>
        <div className="font-mono num text-text-primary font-semibold tabular-nums">
          {valueFormatter(value)}
        </div>
      </div>
      <div className="relative h-2 w-full rounded-full overflow-hidden bg-bg-card-hover/60">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay }}
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${color}CC, ${color})`,
          }}
        />
      </div>
    </div>
  );
}
