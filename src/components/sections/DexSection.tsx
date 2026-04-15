"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, ReactNode } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { useRangeStore } from "@/lib/store";
import { fetcher } from "@/lib/fetcher";
import { fmtUSD, fmtNum, shortAddr } from "@/lib/utils";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { KPICard } from "@/components/ui/KPICard";
import { TimeseriesChart } from "@/components/charts/TimeseriesChart";
import { BenchmarkBar } from "@/components/charts/BenchmarkBar";
import { RankingTable, RankingColumn } from "@/components/ui/RankingTable";
import { LiveFeed } from "@/components/ui/LiveFeed";
import { SkeletonCard } from "@/components/ui/SkeletonCard";

interface ActivityTs {
  block_date: string;
  swaps: number;
  traders: number;
  volume: number;
  [key: string]: unknown;
}
interface TopPair {
  pair: string;
  tx_count: number;
  volume_usd: number;
  [key: string]: unknown;
}
interface ActivityData {
  timeseries: ActivityTs[];
  top_pairs: TopPair[];
}

interface Swap {
  block_date: string;
  transaction_hash: string;
  user_address: string;
  token_in_symbol: string;
  amount_in_usd: number;
  token_out_symbol: string;
  amount_out_usd: number;
}
interface SwapsData {
  swaps: Swap[];
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

export function DexSection() {
  const range = useRangeStore((s) => s.range);

  const activityQ = useQuery({
    queryKey: ["dex-activity", range],
    queryFn: () =>
      fetcher<Envelope<ActivityData>>(
        `/api/v1/tempo/dex/activity?range=${range}`
      ),
    select: (r) => r.data,
  });

  const swapsQ = useQuery({
    queryKey: ["dex-swaps"],
    queryFn: () =>
      fetcher<Envelope<SwapsData>>(`/api/v1/tempo/dex/swaps`),
    select: (r) => r.data,
    refetchInterval: 30_000,
  });

  const ts = activityQ.data?.timeseries ?? [];
  const pairs = activityQ.data?.top_pairs ?? [];
  const swaps = swapsQ.data?.swaps ?? [];

  const activityLoading = activityQ.isLoading;
  const swapsLoading = swapsQ.isLoading;

  // KPIs
  const latest = ts[ts.length - 1];
  const activePairsCount = pairs.length;
  const totalVolume = useMemo(
    () => ts.reduce((s, r) => s + r.volume, 0),
    [ts]
  );

  // Size buckets from recent swaps
  const sizeBuckets = useMemo(() => {
    const buckets = [
      { chain: "<$10", value: 0 },
      { chain: "$10–100", value: 0 },
      { chain: "$100–1K", value: 0 },
      { chain: "$1K–10K", value: 0 },
      { chain: "$10K+", value: 0 },
    ];
    for (const s of swaps) {
      const a = s.amount_in_usd;
      if (a < 10) buckets[0].value++;
      else if (a < 100) buckets[1].value++;
      else if (a < 1000) buckets[2].value++;
      else if (a < 10000) buckets[3].value++;
      else buckets[4].value++;
    }
    return buckets;
  }, [swaps]);

  const pairColumns: RankingColumn<TopPair>[] = [
    { key: "pair", label: "Pair", format: (v) => <span className="font-medium">{String(v)}</span> },
    {
      key: "tx_count",
      label: "Swaps",
      align: "right",
      barKey: "tx_count",
      format: (v) => fmtNum(Number(v)),
    },
    {
      key: "volume_usd",
      label: "Volume",
      align: "right",
      format: (v) => fmtUSD(Number(v)),
    },
  ];

  return (
    <section className="space-y-8">
      <SectionHeader id="dex" eyebrow="DEX" title="DEX Activity" />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {activityLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} variant="kpi" height={80} />
          ))
        ) : (
          <>
            <KPICard
              variant="compact"
              label="24h Swap Count"
              value={latest?.swaps ?? 0}
              format={(n) => fmtNum(n)}
              accent="tempo"
            />
            <KPICard
              variant="compact"
              label="Unique Traders (24h)"
              value={latest?.traders ?? 0}
              format={(n) => fmtNum(n)}
              accent="positive"
            />
            <KPICard
              variant="compact"
              label="Active Pairs"
              value={activePairsCount}
              format={(n) => fmtNum(n)}
              accent="stablecoin"
            />
            <KPICard
              variant="compact"
              label="Total Volume"
              value={totalVolume}
              format={(n) => fmtUSD(n)}
              accent="tempo"
            />
          </>
        )}
      </div>

      {/* Row 1: daily charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Daily Swap Count"
          loading={activityLoading}
          empty={!activityLoading && ts.length === 0}
        >
          <TimeseriesChart
            data={ts}
            xKey="block_date"
            series={[
              { key: "swaps", label: "Swaps", color: "#6C5CE7", type: "bar" },
            ]}
            yFormatter={(n) => fmtNum(n)}
            xFormatter={xFmt}
          />
        </ChartCard>

        <ChartCard
          title="Unique Traders Trend"
          loading={activityLoading}
          empty={!activityLoading && ts.length === 0}
        >
          <TimeseriesChart
            data={ts}
            xKey="block_date"
            series={[
              {
                key: "traders",
                label: "Traders",
                color: "#00CEC9",
                type: "area",
              },
            ]}
            yFormatter={(n) => fmtNum(n)}
            xFormatter={xFmt}
          />
        </ChartCard>
      </div>

      {/* Row 2: top pairs + size histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activityLoading ? (
          <SkeletonCard variant="table" />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Top Trading Pairs (7d)</CardTitle>
            </CardHeader>
            <RankingTable
              columns={pairColumns}
              data={pairs}
              rowKey={(r) => r.pair}
              showRank
            />
          </Card>
        )}

        {swapsLoading ? (
          <SkeletonCard variant="chart" height={320} />
        ) : (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Swap Size Distribution</CardTitle>
                <p className="text-xs text-text-muted mt-1">
                  Based on recent swaps (last 2 days, up to 50 samples)
                </p>
              </div>
            </CardHeader>
            {swaps.length === 0 ? (
              <div className="py-10 text-center text-sm text-text-muted">
                No recent swaps.
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

      {/* Recent swaps feed */}
      {swapsLoading ? (
        <SkeletonCard variant="feed" />
      ) : (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent Swaps</CardTitle>
              <p className="text-xs text-text-muted mt-1">
                Live feed — refreshes every 30s
              </p>
            </div>
          </CardHeader>
          <LiveFeed
            items={swaps}
            itemKey={(s, i) => `${s.transaction_hash}-${i}`}
            emptyText="No recent swaps."
            renderItem={(s) => (
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border-subtle/60 bg-bg-card-hover/30 p-3 text-sm hover:border-border-strong transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-xs text-text-muted w-16 shrink-0">
                    {relativeTime(s.block_date)}
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-text-primary min-w-0">
                    <span>{s.token_in_symbol || "?"}</span>
                    <ArrowRight
                      className="h-3 w-3 text-text-muted shrink-0"
                      aria-hidden
                    />
                    <span>{s.token_out_symbol || "?"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="num font-mono text-text-primary text-sm">
                    {fmtUSD(s.amount_in_usd)}
                  </span>
                  <span className="font-mono text-xs text-text-muted hidden sm:inline">
                    {shortAddr(s.user_address)}
                  </span>
                  <a
                    href={`https://tempo.network/tx/${s.transaction_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-xs text-accent-tempo hover:text-text-primary transition-colors"
                  >
                    {shortAddr(s.transaction_hash, 6, 4)}
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                </div>
              </div>
            )}
          />
        </Card>
      )}
    </section>
  );
}
