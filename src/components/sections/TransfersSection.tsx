"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { useRangeStore } from "@/lib/store";
import { fetcher } from "@/lib/fetcher";
import { fmtUSD, fmtNum, shortAddr } from "@/lib/utils";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { TimeseriesChart } from "@/components/charts/TimeseriesChart";
import { BenchmarkBar } from "@/components/charts/BenchmarkBar";
import { RankingTable, RankingColumn } from "@/components/ui/RankingTable";
import { SkeletonCard } from "@/components/ui/SkeletonCard";

interface TransferTs {
  block_date: string;
  tx_count: number;
  volume_usd: number;
  unique_senders: number;
  unique_receivers: number;
  [key: string]: unknown;
}
interface TopToken {
  token_symbol: string;
  tx_count: number;
  volume_usd: number;
  unique_senders: number;
  unique_receivers: number;
  avg_transfer_usd: number;
  [key: string]: unknown;
}
interface ActivityData {
  timeseries: TransferTs[];
  top_tokens: TopToken[];
}
interface TokensData {
  tokens: TopToken[];
  sort: string;
}

interface RecentTransfer {
  block_date: string;
  transaction_hash: string;
  transfer_from: string;
  transfer_to: string;
  token_symbol: string;
  amount_usd: number;
  [key: string]: unknown;
}
interface FeedData {
  transfers: RecentTransfer[];
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

function relativeTime(dateStr: string): string {
  if (!dateStr) return "—";
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  const diffSec = Math.max(0, (Date.now() - parsed.getTime()) / 1000);
  if (diffSec < 60) return `${Math.floor(diffSec)}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

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

export function TransfersSection() {
  const range = useRangeStore((s) => s.range);
  const [tokenSort, setTokenSort] = useState<"transfers" | "volume">("transfers");

  const activityQ = useQuery({
    queryKey: ["transfers-activity", range],
    queryFn: () =>
      fetcher<Envelope<ActivityData>>(
        `/api/v1/tempo/transfers/activity?range=${range}`
      ),
    select: (r) => r.data,
  });

  const tokensQ = useQuery({
    queryKey: ["tokens-top", range, tokenSort],
    queryFn: () =>
      fetcher<Envelope<TokensData>>(
        `/api/v1/tempo/tokens/top?range=${range}&sort=${tokenSort}`
      ),
    select: (r) => r.data,
  });

  const feedQ = useQuery({
    queryKey: ["transfers-feed"],
    queryFn: () =>
      fetcher<Envelope<FeedData>>(`/api/v1/tempo/transfers/feed`),
    select: (r) => r.data,
    refetchInterval: 30_000,
  });

  const ts = activityQ.data?.timeseries ?? [];
  const topTokens = tokensQ.data?.tokens ?? [];
  const transfers = feedQ.data?.transfers ?? [];

  const activityLoading = activityQ.isPending;
  const feedLoading = feedQ.isPending;

  const sizeBuckets = useMemo(() => {
    const buckets = [
      { chain: "<$10", value: 0 },
      { chain: "$10–100", value: 0 },
      { chain: "$100–1K", value: 0 },
      { chain: "$1K–10K", value: 0 },
      { chain: "$10K+", value: 0 },
    ];
    for (const t of transfers) {
      const a = t.amount_usd;
      if (a < 10) buckets[0].value++;
      else if (a < 100) buckets[1].value++;
      else if (a < 1000) buckets[2].value++;
      else if (a < 10000) buckets[3].value++;
      else buckets[4].value++;
    }
    return buckets;
  }, [transfers]);

  const tokenColumns: RankingColumn<TopToken>[] = [
    {
      key: "token_symbol",
      label: "Token",
      format: (v) => (
        <span className="font-medium text-text-primary">{String(v) || "—"}</span>
      ),
    },
    {
      key: "tx_count",
      label: "Transfers",
      align: "right",
      barKey: tokenSort === "transfers" ? "tx_count" : undefined,
      format: (v) => fmtNum(Number(v)),
    },
    {
      key: "volume_usd",
      label: "Volume",
      align: "right",
      barKey: tokenSort === "volume" ? "volume_usd" : undefined,
      format: (v) => fmtUSD(Number(v)),
    },
    {
      key: "unique_senders",
      label: "Senders",
      align: "right",
      format: (v) => (
        <span className="text-xs text-text-muted tabular-nums">{fmtNum(Number(v))}</span>
      ),
    },
    {
      key: "avg_transfer_usd",
      label: "Avg Tx",
      align: "right",
      format: (v) => (
        <span className="text-xs text-text-muted tabular-nums">{fmtUSD(Number(v))}</span>
      ),
    },
  ];

  const recentColumns: RankingColumn<RecentTransfer>[] = [
    {
      key: "block_date",
      label: "Time",
      format: (v) => (
        <span className="text-xs text-text-muted">{relativeTime(String(v))}</span>
      ),
    },
    {
      key: "transfer_from",
      label: "From",
      format: (v) => (
        <span className="font-mono text-xs text-text-secondary">
          {shortAddr(String(v))}
        </span>
      ),
    },
    {
      key: "transfer_to",
      label: "To",
      format: (_v, r) => (
        <span className="inline-flex items-center gap-1.5">
          <ArrowRight
            className="h-3 w-3 text-text-muted shrink-0"
            aria-hidden
          />
          <span className="font-mono text-xs text-text-primary">
            {shortAddr(r.transfer_to)}
          </span>
        </span>
      ),
    },
    {
      key: "token_symbol",
      label: "Token",
      format: (v) => (
        <span className="font-medium text-text-primary text-xs">
          {String(v) || "—"}
        </span>
      ),
    },
    {
      key: "amount_usd",
      label: "Amount",
      align: "right",
      format: (v) => fmtUSD(Number(v)),
    },
  ];

  return (
    <section className="space-y-8">
      <SectionHeader
        id="transfers"
        eyebrow="Transfers"
        title="Transfer Explorer"
        subtitle="Raw on-chain transfer counts, volume, and the live feed of the most recent settlements."
        accent="tempo"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard
          title="Daily Transfer Count"
          loading={activityLoading}
          empty={!activityLoading && ts.length === 0}
        >
          <TimeseriesChart
            data={ts}
            xKey="block_date"
            series={[
              {
                key: "tx_count",
                label: "Transfers",
                color: "#6C5CE7",
                type: "bar",
              },
            ]}
            yFormatter={(n) => fmtNum(n)}
            xFormatter={xFmt}
          />
        </ChartCard>

        <ChartCard
          title="Transfer Volume"
          loading={activityLoading}
          empty={!activityLoading && ts.length === 0}
        >
          <TimeseriesChart
            data={ts}
            xKey="block_date"
            series={[
              {
                key: "volume_usd",
                label: "Volume",
                color: "#00CEC9",
                type: "area",
              },
            ]}
            yFormatter={(n) => fmtUSD(n)}
            xFormatter={xFmt}
          />
        </ChartCard>

        <ChartCard
          title="Unique Addresses"
          subtitle="Distinct senders and receivers per day"
          loading={activityLoading}
          empty={!activityLoading && ts.length === 0}
        >
          <TimeseriesChart
            data={ts}
            xKey="block_date"
            series={[
              {
                key: "unique_senders",
                label: "Senders",
                color: "#6C5CE7",
              },
              {
                key: "unique_receivers",
                label: "Receivers",
                color: "#00CEC9",
              },
            ]}
            yFormatter={(n) => fmtNum(n)}
            xFormatter={xFmt}
            showLegend
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tokensQ.isPending ? (
          <SkeletonCard variant="table" />
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle>
                  Top Tokens {tokenSort === "transfers" ? "by Transfer Count" : "by Volume"}
                </CardTitle>
                <div className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-bg-card p-0.5 text-[11px]">
                  {(["transfers", "volume"] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setTokenSort(opt)}
                      className={cn(
                        "rounded-full px-2.5 py-0.5 transition-colors capitalize",
                        tokenSort === opt
                          ? "bg-accent-tempo/20 text-accent-tempo"
                          : "text-text-muted hover:text-text-primary"
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <RankingTable
              columns={tokenColumns}
              data={topTokens}
              rowKey={(r) => r.token_symbol}
              showRank
            />
          </Card>
        )}

        {feedLoading ? (
          <SkeletonCard variant="chart" height={320} />
        ) : (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Transfer Size Distribution</CardTitle>
                <p className="text-xs text-text-muted mt-1">
                  Based on the most recent 50 transfers
                </p>
              </div>
            </CardHeader>
            {transfers.length === 0 ? (
              <div className="py-10 text-center text-sm text-text-muted">
                No recent transfers.
              </div>
            ) : (
              <BenchmarkBar
                data={sizeBuckets}
                valueFormatter={(n) => fmtNum(n)}
                highlight=""
                sortDir="desc"
              />
            )}
          </Card>
        )}
      </div>

      {feedLoading ? (
        <SkeletonCard variant="table" />
      ) : (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent Transfers</CardTitle>
              <p className="text-xs text-text-muted mt-1">
                Live feed — refreshes every 30s
              </p>
            </div>
          </CardHeader>
          <RankingTable
            columns={recentColumns}
            data={transfers}
            rowKey={(r, i) => `${r.transaction_hash}-${i}`}
          />
        </Card>
      )}
    </section>
  );
}
