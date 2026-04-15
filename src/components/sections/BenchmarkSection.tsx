"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useRangeStore } from "@/lib/store";
import { fetcher } from "@/lib/fetcher";
import { fmtUSD, fmtNum, cn } from "@/lib/utils";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { BenchmarkBar } from "@/components/charts/BenchmarkBar";
import { SavingsCalculator } from "@/components/ui/SavingsCalculator";
import { SkeletonCard } from "@/components/ui/SkeletonCard";

interface BenchmarkRow {
  chain: "tempo" | "ethereum" | "base" | "arbitrum";
  avg_cost_usd: number;
  avg_gas_price_gwei?: number;
  avg_gas_per_tx?: number;
  savings_vs_eth_x: number;
}

interface BenchmarkData {
  chains: BenchmarkRow[];
  methodology: string;
}

interface Envelope<T> {
  data: T;
  meta: { freshness: string };
}

function costFormat(n: number) {
  if (n === 0) return "$0";
  if (n < 0.01) return fmtUSD(n, { decimals: 6, compact: false });
  return fmtUSD(n, { decimals: 4, compact: false });
}

export function BenchmarkSection() {
  const range = useRangeStore((s) => s.range);

  const { data, isPending: isLoading, isError, refetch } = useQuery({
    queryKey: ["benchmark", range],
    queryFn: () =>
      fetcher<Envelope<BenchmarkData>>(`/api/v1/tempo/benchmark?range=${range}`),
    select: (r) => r.data,
    staleTime: 60 * 60 * 1000, // 1h
  });

  const { tempoRow, ethRow, baseRow, byChain } = useMemo(() => {
    const chains = data?.chains ?? [];
    const map: Record<string, BenchmarkRow | undefined> = {};
    for (const c of chains) map[c.chain] = c;
    return {
      tempoRow: map["tempo"],
      ethRow: map["ethereum"],
      baseRow: map["base"],
      byChain: map,
    };
  }, [data]);

  const barData = useMemo(
    () =>
      (data?.chains ?? []).map((c) => ({
        chain: c.chain,
        value: c.avg_cost_usd,
        label: costFormat(c.avg_cost_usd),
      })),
    [data]
  );

  const cheaperVsEth = useMemo(() => {
    if (!tempoRow || !ethRow || tempoRow.avg_cost_usd <= 0) return 0;
    return ethRow.avg_cost_usd / tempoRow.avg_cost_usd;
  }, [tempoRow, ethRow]);

  const cheaperVsBase = useMemo(() => {
    if (!tempoRow || !baseRow || tempoRow.avg_cost_usd <= 0) return 0;
    return baseRow.avg_cost_usd / tempoRow.avg_cost_usd;
  }, [tempoRow, baseRow]);

  return (
    <section className="space-y-8">
      <SectionHeader
        id="cost-benchmark"
        eyebrow="Core Value"
        title="Cost Benchmark Arena"
        subtitle="Average cost per transaction over the last 7 days, across major EVM chains."
      />

      {isError ? (
        <Card className="bg-accent-negative/5 border-accent-negative/20">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-accent-negative">
              Failed to load benchmark data.
            </span>
            <button
              onClick={() => refetch()}
              className="text-accent-tempo hover:underline text-xs font-medium"
            >
              Retry
            </button>
          </div>
        </Card>
      ) : null}

      {/* Highlight stats — Tempo card spans 2 cols */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading || !tempoRow ? (
          <>
            <SkeletonCard variant="kpi" height={180} className="md:col-span-2" />
            <SkeletonCard variant="kpi" height={180} />
            <SkeletonCard variant="kpi" height={180} />
          </>
        ) : (
          <>
            <Card
              glow
              gradient
              className="relative overflow-hidden md:col-span-2 md:row-span-1"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-accent-tempo/25 blur-3xl"
              />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="h-2 w-2 rounded-full bg-accent-tempo shadow-[0_0_12px_rgba(108,92,231,0.9)]"
                    aria-hidden
                  />
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-accent-tempo">
                    Tempo · avg cost per tx
                  </div>
                </div>
                <div
                  className={cn(
                    "font-display font-bold text-text-primary num tabular-nums",
                    "text-[64px] leading-[1]"
                  )}
                >
                  {costFormat(tempoRow.avg_cost_usd)}
                </div>
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-positive/15 px-2 py-0.5 text-[11px] font-semibold text-accent-positive">
                    ↓ Lower is better
                  </span>
                  <span className="text-xs text-text-muted">
                    Last 7 days · stablecoin-denominated
                  </span>
                </div>
              </div>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="h-2 w-2 rounded-full bg-chain-ethereum"
                  aria-hidden
                />
                <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  vs Ethereum
                </div>
              </div>
              <div className="font-display text-[40px] leading-[1.05] font-bold text-text-primary num tabular-nums">
                {cheaperVsEth > 0
                  ? `${fmtNum(cheaperVsEth, { decimals: 0 })}×`
                  : "—"}
              </div>
              <div className="mt-1 text-xs font-medium text-accent-positive">
                cheaper
              </div>
              <div className="mt-3 text-xs text-text-muted num">
                Eth: {costFormat(ethRow?.avg_cost_usd ?? 0)} / tx
              </div>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="h-2 w-2 rounded-full bg-chain-base"
                  aria-hidden
                />
                <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  vs Base
                </div>
              </div>
              <div className="font-display text-[40px] leading-[1.05] font-bold text-text-primary num tabular-nums">
                {cheaperVsBase > 0
                  ? `${fmtNum(cheaperVsBase, { decimals: 0 })}×`
                  : "—"}
              </div>
              <div className="mt-1 text-xs font-medium text-accent-positive">
                cheaper
              </div>
              <div className="mt-3 text-xs text-text-muted num">
                Base: {costFormat(baseRow?.avg_cost_usd ?? 0)} / tx
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Main chart & calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
        <Card>
          <div className="mb-5">
            <h3 className="font-display text-lg font-semibold text-text-primary">
              Per-transaction cost by chain
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Tempo vs major EVM networks — 7-day window
            </p>
          </div>
          {isLoading ? (
            <SkeletonCard variant="chart" height={280} className="!border-0 !p-0" />
          ) : barData.length === 0 ? (
            <div className="py-10 text-center text-sm text-text-muted">
              No data in this range.
            </div>
          ) : (
            <BenchmarkBar
              data={barData}
              valueFormatter={costFormat}
              highlight="tempo"
              reverseGood
              sortDir="asc"
            />
          )}

          {data?.methodology ? (
            <details className="mt-6 rounded-xl border border-border-subtle bg-bg-card-hover/40 group overflow-hidden">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-tempo" aria-hidden />
                  Methodology
                </span>
                <svg
                  className="h-3.5 w-3.5 text-text-muted group-open:rotate-180 transition-transform"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M2 4.5L6 8.5L10 4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </summary>
              <div className="border-t border-border-subtle px-4 py-4 grid gap-3 md:grid-cols-2 text-[12px] leading-relaxed text-text-secondary">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                    Data source
                  </div>
                  <div>
                    On-chain aggregates from <span className="text-text-primary">agent.*_chain_daily</span>,
                    queried via Surf.
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                    Formula
                  </div>
                  <div>
                    <code className="font-mono text-[11px] text-text-primary">
                      total_fees_usd / tx_count
                    </code>{" "}
                    averaged over the last 7 days.
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                    Gas-token assumptions
                  </div>
                  <div>
                    Native gas fees converted to USD at daily close. Tempo fees
                    are stablecoin-denominated.
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                    Refresh cadence
                  </div>
                  <div>
                    Backend cache 1h · UI refetch every 90s · compare window
                    7d.
                  </div>
                </div>
                <div className="md:col-span-2 border-t border-border-subtle pt-3">
                  <p className="text-[12px] leading-relaxed text-text-muted">
                    {data.methodology}
                  </p>
                </div>
              </div>
            </details>
          ) : null}
        </Card>

        {isLoading || !tempoRow ? (
          <SkeletonCard variant="chart" height={480} />
        ) : (
          <SavingsCalculator
            tempoCost={tempoRow.avg_cost_usd}
            competitorCosts={{
              ethereum: byChain["ethereum"]?.avg_cost_usd ?? 0,
              base: byChain["base"]?.avg_cost_usd ?? 0,
              arbitrum: byChain["arbitrum"]?.avg_cost_usd ?? 0,
            }}
          />
        )}
      </div>
    </section>
  );
}
