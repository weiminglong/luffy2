"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface BarDatum {
  chain: string;
  value: number;
  label?: string;
}

interface BenchmarkBarProps {
  data: BarDatum[];
  valueFormatter?: (n: number) => string;
  highlight?: string;
  reverseGood?: boolean;
  height?: number;
  className?: string;
  sortDir?: "asc" | "desc";
}

const CHAIN_COLOR_CLASS: Record<string, string> = {
  tempo: "bg-chain-tempo",
  ethereum: "bg-chain-ethereum",
  base: "bg-chain-base",
  arbitrum: "bg-chain-arbitrum",
  polygon: "bg-chain-polygon",
  solana: "bg-chain-solana",
  bnb: "bg-chain-bnb",
};

const CHAIN_TEXT_CLASS: Record<string, string> = {
  tempo: "text-chain-tempo",
  ethereum: "text-chain-ethereum",
  base: "text-chain-base",
  arbitrum: "text-chain-arbitrum",
  polygon: "text-chain-polygon",
  solana: "text-chain-solana",
  bnb: "text-chain-bnb",
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function BenchmarkBar({
  data,
  valueFormatter = (n) => n.toLocaleString(),
  highlight = "tempo",
  reverseGood: _reverseGood = false,
  height: _height,
  sortDir = "asc",
  className,
}: BenchmarkBarProps) {
  void _reverseGood;
  void _height;
  const sorted = useMemo(() => {
    const arr = [...data];
    arr.sort((a, b) =>
      sortDir === "asc" ? a.value - b.value : b.value - a.value
    );
    return arr;
  }, [data, sortDir]);

  const max = useMemo(
    () => Math.max(...sorted.map((d) => Math.abs(d.value)), 1),
    [sorted]
  );

  return (
    <div className={cn("space-y-3", className)}>
      {sorted.map((d, idx) => {
        const pct = Math.max((Math.abs(d.value) / max) * 100, 2);
        const isHighlighted = d.chain.toLowerCase() === highlight.toLowerCase();
        const barColor =
          CHAIN_COLOR_CLASS[d.chain.toLowerCase()] ?? "bg-accent-tempo";
        const textColor =
          CHAIN_TEXT_CLASS[d.chain.toLowerCase()] ?? "text-text-primary";

        return (
          <div
            key={d.chain}
            className={cn(
              "group relative rounded-xl p-3 transition-colors",
              isHighlighted
                ? "bg-accent-tempo/5 ring-1 ring-accent-tempo/30"
                : "hover:bg-bg-card-hover/40"
            )}
          >
            <div className="flex items-center justify-between text-sm mb-2">
              <div className={cn("flex items-center gap-2 font-medium")}>
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    barColor,
                    isHighlighted && "animate-pulse-glow"
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    isHighlighted ? textColor : "text-text-primary"
                  )}
                >
                  {capitalize(d.chain)}
                </span>
                {isHighlighted ? (
                  <span className="rounded-full bg-accent-tempo/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-tempo">
                    You
                  </span>
                ) : null}
              </div>
              <div className="num font-semibold text-text-primary">
                {d.label ?? valueFormatter(d.value)}
              </div>
            </div>

            <div className="relative h-2 w-full overflow-hidden rounded-full bg-bg-card-hover/60">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${pct}%` }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{
                  duration: 0.9,
                  ease: [0.16, 1, 0.3, 1],
                  delay: idx * 0.06,
                }}
                className={cn(
                  "h-full rounded-full",
                  barColor,
                  isHighlighted && "glow-tempo"
                )}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
