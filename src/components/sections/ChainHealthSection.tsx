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

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["chain-health", range],
    queryFn: () =>
      fetcher<Envelope<HealthData>>(`/api/v1/tempo/chain/health?range=${range}`),
    select: (r) => r.data,
  });

  const ts = data?.timeseries ?? [];
  const empty = !isLoading && ts.length === 0;

  return (
    <section className="space-y-8">
      <SectionHeader
        id="chain-health"
        eyebrow="Network"
        title="Chain Health & Growth"
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
          subtitle="Daily / weekly / monthly active users"
          loading={isLoading}
          empty={empty}
        >
          <TimeseriesChart
            data={ts}
            xKey="block_date"
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
          subtitle="Total transactions per day"
          loading={isLoading}
          empty={empty}
        >
          <TimeseriesChart
            data={ts}
            xKey="block_date"
            series={[
              { key: "total_txs", label: "Transactions", color: "#6C5CE7", type: "bar" },
            ]}
            yFormatter={(n) => fmtNum(n)}
            xFormatter={xFmt}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Total Fees & Sponsored %"
          subtitle="Daily fee revenue and share of sponsored transactions"
          loading={isLoading}
          empty={empty}
        >
          <TimeseriesChart
            data={ts}
            xKey="block_date"
            series={[
              {
                key: "total_fees_usd",
                label: "Total Fees",
                color: "#FFA801",
                type: "bar",
              },
              {
                key: "sponsored_fee_pct",
                label: "Sponsored %",
                color: "#00CEC9",
              },
            ]}
            yFormatter={(n) => (n >= 1 ? fmtUSD(n) : `${n.toFixed(1)}%`)}
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
      </div>
    </section>
  );
}
