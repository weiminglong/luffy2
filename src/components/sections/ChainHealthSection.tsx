"use client";

import { useQuery } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useRangeStore } from "@/lib/store";
import { fetcher } from "@/lib/fetcher";
import { fmtUSD, fmtNum } from "@/lib/utils";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { TimeseriesChart } from "@/components/charts/TimeseriesChart";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { Activity, Flame } from "lucide-react";

interface HealthPoint {
  block_date: string;
  dau: number;
  wau: number;
  mau: number;
  new_users: number;
  returning_users: number;
  total_txs: number;
  total_transfers: number;
  total_fees_usd: number;
  sponsored_fee_pct: number;
  dex_volume_usd: number;
  batched_tx_count: number;
  contract_deployments_from_traces: number;
  [key: string]: unknown;
}

interface HealthData {
  timeseries: HealthPoint[];
}

interface Envelope<T> {
  data: T;
  meta: { freshness: string };
}

interface LifetimeData {
  cumulative_users: number;
  cumulative_total_txs: number;
  cumulative_user_txs: number;
  cumulative_fees_usd: number;
  cumulative_deployments: number;
  avg_tps_7d: number;
  avg_user_tps_7d: number;
  avg_fees_per_sec_7d: number;
}

interface QualityPoint {
  block_date: string;
  total_transactions: number;
  user_transactions: number;
  system_transactions: number;
  user_tx_pct: number;
  contract_deployments: number;
  avg_fee_usd: number;
  median_fee_usd: number;
  p95_fee_usd: number;
  total_fees_usd: number;
  sponsored_pct: number;
  unique_fee_payers: number;
  [key: string]: unknown;
}

interface QualityData {
  timeseries: QualityPoint[];
}

const xFmt = (d: string) => {
  if (!d) return "";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

function ChartCard({
  title,
  subtitle,
  children,
  loading,
  empty,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  loading?: boolean;
  empty?: boolean;
}) {
  if (loading) return <SkeletonCard variant="chart" height={320} />;
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          {subtitle ? (
            <p className="text-xs text-text-muted mt-1">{subtitle}</p>
          ) : null}
        </div>
      </CardHeader>
      {empty ? (
        <div className="py-10 text-center text-sm text-text-muted">
          No data in this range.
        </div>
      ) : (
        children
      )}
    </Card>
  );
}

export function ChainHealthSection() {
  const range = useRangeStore((s) => s.range);

  const { data, isPending: isLoading, isError, refetch } = useQuery({
    queryKey: ["chain-health", range],
    queryFn: () =>
      fetcher<Envelope<HealthData>>(`/api/v1/tempo/chain/health?range=${range}`),
    select: (r) => r.data,
  });

  const lifetimeQ = useQuery({
    queryKey: ["lifetime"],
    queryFn: () => fetcher<Envelope<LifetimeData>>(`/api/v1/tempo/lifetime`),
    select: (r) => r.data,
  });

  const qualityQ = useQuery({
    queryKey: ["chain-quality", range],
    queryFn: () =>
      fetcher<Envelope<QualityData>>(`/api/v1/tempo/chain/quality?range=${range}`),
    select: (r) => r.data,
  });
  const qts = qualityQ.data?.timeseries ?? [];

  const ts = data?.timeseries ?? [];
  const empty = !isLoading && ts.length === 0;

  return (
    <section className="space-y-8">
      <SectionHeader
        id="chain-health"
        eyebrow="Network"
        title="Chain Health & Growth"
        subtitle="Active user cohorts, throughput, fee dynamics, and DEX volume over time."
        accent="positive"
        action={
          lifetimeQ.data ? (
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-accent-positive/30 bg-accent-positive/10 px-2.5 py-1 text-[11px] font-medium text-accent-positive tabular-nums"
                title="Average transactions per second over the last 7 days"
              >
                <Activity className="h-3 w-3" />
                <span className="text-text-primary">
                  {lifetimeQ.data.avg_tps_7d.toFixed(2)}
                </span>
                <span className="text-text-muted">TPS</span>
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-card px-2.5 py-1 text-[11px] font-medium text-text-secondary tabular-nums"
                title="Average fees earned per second over the last 7 days"
              >
                <Flame className="h-3 w-3" />
                <span className="text-text-primary">
                  ${lifetimeQ.data.avg_fees_per_sec_7d.toFixed(3)}
                </span>
                <span className="text-text-muted">/s</span>
              </span>
            </div>
          ) : null
        }
      />

      {isError ? (
        <Card className="bg-accent-negative/5 border-accent-negative/20">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-accent-negative">
              Failed to load chain health data.
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard
          title="Active Users"
          subtitle="DAU / WAU / MAU — WAU and MAU trail DAU during early launch"
          loading={isLoading}
          empty={empty}
        >
          <TimeseriesChart
            data={ts}
            xKey="block_date"
            height={300}
            series={[
              { key: "dau", label: "DAU", color: "#6C5CE7" },
              { key: "wau", label: "WAU", color: "#00CEC9" },
              { key: "mau", label: "MAU", color: "#2ED573" },
            ]}
            yFormatter={(n) => fmtNum(n)}
            xFormatter={xFmt}
            showLegend
          />
        </ChartCard>

        <ChartCard
          title="New vs Returning Users"
          subtitle="Daily breakdown of user cohorts"
          loading={isLoading}
          empty={empty}
        >
          <TimeseriesChart
            data={ts}
            xKey="block_date"
            stackId="users"
            series={[
              { key: "new_users", label: "New", color: "#6C5CE7", type: "area" },
              {
                key: "returning_users",
                label: "Returning",
                color: "#00CEC9",
                type: "area",
              },
            ]}
            yFormatter={(n) => fmtNum(n)}
            xFormatter={xFmt}
            showLegend
          />
        </ChartCard>

        <ChartCard
          title="Daily Transactions"
          subtitle="User vs. system transactions per day"
          loading={isLoading || qualityQ.isPending}
          empty={empty && qts.length === 0}
        >
          <TimeseriesChart
            data={qts}
            xKey="block_date"
            stackId="txs"
            series={[
              {
                key: "user_transactions",
                label: "User",
                color: "#6C5CE7",
                type: "bar",
              },
              {
                key: "system_transactions",
                label: "System",
                color: "#3F4158",
                type: "bar",
              },
            ]}
            yFormatter={(n) => fmtNum(n)}
            xFormatter={xFmt}
            showLegend
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard
          title="Fee Dynamics"
          subtitle="Daily revenue vs. user experience — median & p95 per-tx fees"
          loading={isLoading || qualityQ.isPending}
          empty={empty && qts.length === 0}
        >
          <TimeseriesChart
            data={qts}
            xKey="block_date"
            series={[
              {
                key: "total_fees_usd",
                label: "Total Fees",
                color: "#FFA801",
                type: "bar",
              },
              {
                key: "median_fee_usd",
                label: "Median Fee",
                color: "#00CEC9",
              },
              {
                key: "p95_fee_usd",
                label: "p95 Fee",
                color: "#FD7272",
              },
            ]}
            yFormatter={(n) => (n >= 1 ? fmtUSD(n) : `$${n.toFixed(4)}`)}
            xFormatter={xFmt}
            showLegend
          />
        </ChartCard>

        <ChartCard
          title="DEX Volume Trend"
          subtitle="Daily DEX volume in USD"
          loading={isLoading}
          empty={empty}
        >
          <TimeseriesChart
            data={ts}
            xKey="block_date"
            series={[
              {
                key: "dex_volume_usd",
                label: "DEX Volume",
                color: "#6C5CE7",
                type: "area",
              },
            ]}
            yFormatter={(n) => fmtUSD(n)}
            xFormatter={xFmt}
          />
        </ChartCard>

        <ChartCard
          title="Contract Deployments"
          subtitle="New smart contracts deployed per day (trace-derived)"
          loading={isLoading}
          empty={empty}
        >
          <TimeseriesChart
            data={ts}
            xKey="block_date"
            series={[
              {
                key: "contract_deployments_from_traces",
                label: "Deployments",
                color: "#2ED573",
                type: "bar",
              },
            ]}
            yFormatter={(n) => fmtNum(n)}
            xFormatter={xFmt}
          />
        </ChartCard>
      </div>
    </section>
  );
}
