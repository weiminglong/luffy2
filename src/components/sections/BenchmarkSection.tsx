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

  const { data, isLoading, isError, refetch } = useQuery({
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
        eyebrow="★ Core Value"
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

      {/* Highlight stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading || !tempoRow ? (
          <>
            <SkeletonCard variant="kpi" height={160} />
            <SkeletonCard variant="kpi" height={160} />
            <SkeletonCard variant="kpi" height={160} />
          </>
        ) : (
          <>
            <Card glow gradient className="relative overflow-hidden">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-accent-tempo mb-3">
                Tempo avg cost per tx
              </div>
              <div
                className={cn(
                  "font-display font-bold text-text-primary num",
                  "text-[48px] leading-[1.05]"
                )}
                style={{ fontFamily: "var(--font-space-grotesk)" }}
              >
                {costFormat(tempoRow.avg_cost_usd)}
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent-positive/10 px-2 py-0.5 text-[11px] font-medium text-accent-positive">
                ↓ Lower is better
              </div>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-3">
                Cheaper than Ethereum
              </div>
              <div className="font-display text-[48px] leading-[1.05] font-bold text-text-primary num">
                {cheaperVsEth > 0 ? `${fmtNum(cheaperVsEth, { decimals: 0 })}×` : "—"}
              </div>
              <div className="mt-2 text-xs text-text-muted">
                vs {costFormat(ethRow?.avg_cost_usd ?? 0)} per tx on Ethereum
              </div>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-3">
                Cheaper than Base
              </div>
              <div className="font-display text-[48px] leading-[1.05] font-bold text-text-primary num">
                {cheaperVsBase > 0 ? `${fmtNum(cheaperVsBase, { decimals: 0 })}×` : "—"}
              </div>
              <div className="mt-2 text-xs text-text-muted">
                vs {costFormat(baseRow?.avg_cost_usd ?? 0)} per tx on Base
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
            <details className="mt-6 rounded-xl border border-border-subtle bg-bg-card-hover/40 p-4 group">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors flex items-center justify-between">
                Methodology
                <span className="text-text-muted group-open:rotate-180 transition-transform">
                  ▾
                </span>
              </summary>
              <p className="mt-3 text-xs leading-relaxed text-text-secondary">
                {data.methodology}
              </p>
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
