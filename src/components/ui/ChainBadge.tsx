"use client";

import { cn } from "@/lib/utils";

type Chain =
  | "tempo"
  | "ethereum"
  | "base"
  | "arbitrum"
  | "polygon"
  | "solana"
  | "bnb";

interface ChainBadgeProps {
  chain: Chain;
  size?: "sm" | "md";
  className?: string;
}

const LABELS: Record<Chain, string> = {
  tempo: "Tempo",
  ethereum: "Ethereum",
  base: "Base",
  arbitrum: "Arbitrum",
  polygon: "Polygon",
  solana: "Solana",
  bnb: "BNB",
};

const DOT_COLOR: Record<Chain, string> = {
  tempo: "bg-chain-tempo",
  ethereum: "bg-chain-ethereum",
  base: "bg-chain-base",
  arbitrum: "bg-chain-arbitrum",
  polygon: "bg-chain-polygon",
  solana: "bg-chain-solana",
  bnb: "bg-chain-bnb",
};

export function ChainBadge({ chain, size = "md", className }: ChainBadgeProps) {
  const sizing =
    size === "sm"
      ? "text-[11px] px-2 py-0.5 gap-1.5"
      : "text-xs px-2.5 py-1 gap-2";
  const dotSize = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border-subtle bg-bg-card text-text-primary font-medium",
        sizing,
        className
      )}
    >
      <span
        aria-hidden
        className={cn("rounded-full", dotSize, DOT_COLOR[chain])}
      />
      {LABELS[chain]}
    </span>
  );
}
