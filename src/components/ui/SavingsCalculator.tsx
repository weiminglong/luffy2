"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Share2, Check } from "lucide-react";
import { cn, fmtUSD, fmtNum } from "@/lib/utils";
import { Card } from "./Card";

interface SavingsCalculatorProps {
  tempoCost: number;
  competitorCosts: Record<string, number>;
  className?: string;
}

interface SliderConfig {
  key: "transfers" | "swaps" | "stablecoin";
  label: string;
  description: string;
  max: number;
}

const SLIDERS: SliderConfig[] = [
  {
    key: "transfers",
    label: "Monthly transfers",
    description: "ERC-20 / native token transfers",
    max: 1_000_000,
  },
  {
    key: "swaps",
    label: "Monthly swaps",
    description: "DEX trades via router contracts",
    max: 1_000_000,
  },
  {
    key: "stablecoin",
    label: "Stablecoin transfers",
    description: "USDC / pathUSD / USDS payments",
    max: 1_000_000,
  },
];

// Log-ish mapping for a 0..1 slider → 0..max transactions.
function sliderToTx(v: number, max: number) {
  if (v <= 0) return 0;
  // Expand with power curve so the low range is accessible.
  return Math.round(Math.pow(v, 2.2) * max);
}

function txToSlider(tx: number, max: number) {
  if (tx <= 0) return 0;
  return Math.pow(tx / max, 1 / 2.2);
}

const CHAIN_COLORS: Record<string, string> = {
  tempo: "#6C5CE7",
  ethereum: "#627EEA",
  base: "#0052FF",
  arbitrum: "#28A0F0",
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function SavingsCalculator({
  tempoCost,
  competitorCosts,
  className,
}: SavingsCalculatorProps) {
  const [sliders, setSliders] = useState<Record<string, number>>({
    transfers: txToSlider(100_000, 1_000_000),
    swaps: txToSlider(20_000, 1_000_000),
    stablecoin: txToSlider(50_000, 1_000_000),
  });
  const [copied, setCopied] = useState(false);

  const txs = useMemo(
    () =>
      Object.fromEntries(
        SLIDERS.map((s) => [s.key, sliderToTx(sliders[s.key] ?? 0, s.max)])
      ) as Record<string, number>,
    [sliders]
  );

  const totalTx =
    (txs.transfers ?? 0) + (txs.swaps ?? 0) + (txs.stablecoin ?? 0);

  const tempoTotal = totalTx * tempoCost;

  const competitorTotals = useMemo(() => {
    return Object.fromEntries(
      Object.entries(competitorCosts).map(([chain, cost]) => [
        chain,
        totalTx * cost,
      ])
    );
  }, [competitorCosts, totalTx]);

  const share = () => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams({
      transfers: String(txs.transfers),
      swaps: String(txs.swaps),
      stablecoin: String(txs.stablecoin),
    });
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}#calculator`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => undefined);
  };

  return (
    <Card className={cn("space-y-6", className)} gradient>
      <div className="space-y-5">
        {SLIDERS.map((s) => {
          const raw = sliders[s.key] ?? 0;
          const txValue = txs[s.key] ?? 0;
          return (
            <div key={s.key}>
              <div className="flex items-end justify-between mb-2">
                <div>
                  <div className="text-sm font-medium text-text-primary">
                    {s.label}
                  </div>
                  <div className="text-xs text-text-muted">{s.description}</div>
                </div>
                <div className="font-display text-xl font-semibold text-text-primary num">
                  {fmtNum(txValue)}
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.001}
                value={raw}
                aria-label={s.label}
                onChange={(e) =>
                  setSliders((prev) => ({
                    ...prev,
                    [s.key]: Number(e.target.value),
                  }))
                }
                className="w-full h-1.5 appearance-none rounded-full bg-bg-card-hover accent-accent-tempo cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-accent-tempo
                  [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(108,92,231,0.2)]
                  [&::-webkit-slider-thumb]:transition-all
                  [&::-webkit-slider-thumb]:hover:scale-110"
              />
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.div
          key={`tempo-${tempoTotal.toFixed(2)}`}
          initial={{ opacity: 0.6, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-accent-tempo/40 bg-accent-tempo/10 p-4 glow-tempo"
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider text-accent-tempo">
            Tempo
          </div>
          <div className="font-display text-2xl font-bold text-text-primary num mt-2">
            {fmtUSD(tempoTotal)}
          </div>
          <div className="text-[11px] text-text-muted mt-1">
            {fmtUSD(tempoCost, { decimals: 4 })} / tx
          </div>
        </motion.div>

        {Object.entries(competitorTotals).map(([chain, total]) => {
          const savingsPct =
            total > 0 ? ((total - tempoTotal) / total) * 100 : 0;
          const color = CHAIN_COLORS[chain] ?? "#8B8D9E";
          return (
            <motion.div
              key={`${chain}-${total.toFixed(2)}`}
              initial={{ opacity: 0.6, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl border border-border-subtle bg-bg-card p-4"
            >
              <div
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color }}
              >
                {capitalize(chain)}
              </div>
              <div className="font-display text-2xl font-bold text-text-primary num mt-2">
                {fmtUSD(total)}
              </div>
              <div className="text-[11px] text-accent-positive mt-1 font-medium num">
                Save {savingsPct.toFixed(1)}%
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-text-muted">
          Based on {fmtNum(totalTx)} monthly transactions
        </div>
        <button
          type="button"
          onClick={share}
          className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-card px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-tempo"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-accent-positive" />
              Copied
            </>
          ) : (
            <>
              <Share2 className="h-3.5 w-3.5" />
              Share results
            </>
          )}
        </button>
      </div>
    </Card>
  );
}
