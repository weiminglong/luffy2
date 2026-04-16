"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, ReactNode } from "react";
import {
  ArrowRight,
  ExternalLink,
  Repeat,
  Users,
  Layers,
  Droplet,
} from "lucide-react";
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

interface PoolRow {
  pair_address: string;
  token0_symbol: string;
  token1_symbol: string;
  token0_balance: number;
  token1_balance: number;
  token0_usd: number;
  token1_usd: number;
  tvl_usd: number;
  project: string;
  [key: string]: unknown;
}
interface PoolsData {
  pools: PoolRow[];
}

interface TvlData {
  current_total_usd: number;
  prior_7d_total_usd: number;
  by_project: Array<{ project: string; tvl_usd: number; pools: number }>;
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

  const poolsQ = useQuery({
    queryKey: ["dex-pools"],
    queryFn: () => fetcher<Envelope<PoolsData>>(`/api/v1/tempo/dex/pools`),
    select: (r) => r.data,
  });

  const tvlQ = useQuery({
    queryKey: ["tvl", range],
    queryFn: () => fetcher<Envelope<TvlData>>(`/api/v1/tempo/tvl?range=${range}`),
    select: (r) => r.data,
  });

  const ts = activityQ.data?.timeseries ?? [];
  // Defensive client-side filter: drop any pair containing empty, UNKNOWN or
  // malformed token symbols so the leaderboard stays clean.
  const pairs = useMemo(
    () =>
      (activityQ.data?.top_pairs ?? []).filter((p) => {
        if (!p.pair) return false;
        const [a, b] = p.pair.split("/");
        const bad = (s?: string) =>
          !s || s.trim() === "" || s === "UNKNOWN" || s === "?";
        return !bad(a) && !bad(b);
      }),
    [activityQ.data]
  );
  const swaps = useMemo(
    () =>
      (swapsQ.data?.swaps ?? []).filter(
        (s) =>
          s.token_in_symbol &&
          s.token_out_symbol &&
          s.token_in_symbol !== "UNKNOWN" &&
          s.token_out_symbol !== "UNKNOWN"
      ),
    [swapsQ.data]
  );

  const activityLoading = activityQ.isPending;
  const swapsLoading = swapsQ.isPending;

  // KPIs — skip today's partial day for accurate 24h metrics.
  const latest = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return [...ts].reverse().find((r) => r.block_date < todayStr) ?? ts[ts.length - 1];
  }, [ts]);
  const activePairsCount = pairs.length;

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

  const pools = useMemo(
    () =>
      (poolsQ.data?.pools ?? []).filter(
        (p) => p.token0_symbol && p.token1_symbol && p.tvl_usd > 0
      ),
    [poolsQ.data]
  );

  const poolColumns: RankingColumn<PoolRow>[] = [
    {
      key: "pair_address",
      label: "Pool",
      format: (_v, r) => (
        <span className="font-medium text-text-primary">
          {r.token0_symbol === "UNKNOWN" ? "?" : r.token0_symbol}
          <span className="text-text-muted mx-1">/</span>
          {r.token1_symbol === "UNKNOWN" ? "?" : r.token1_symbol}
        </span>
      ),
    },
    {
      key: "tvl_usd",
      label: "TVL",
      align: "right",
      barKey: "tvl_usd",
      format: (v) => fmtUSD(Number(v)),
    },
    {
      key: "token0_usd",
      label: "Token0 $",
      align: "right",
      format: (v) => (
        <span className="text-xs text-text-muted tabular-nums">
          {fmtUSD(Number(v))}
        </span>
      ),
    },
    {
      key: "token1_usd",
      label: "Token1 $",
      align: "right",
      format: (v) => (
        <span className="text-xs text-text-muted tabular-nums">
          {fmtUSD(Number(v))}
        </span>
      ),
    },
  ];

  return (
    <section className="space-y-8">
      <SectionHeader
        id="dex"
        eyebrow="DEX"
        title="DEX Activity"
        subtitle="Swap volume, unique traders, and liquidity mix on Tempo-native DEX protocols."
        accent="tempo"
      />

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
              icon={<Repeat className="h-4 w-4" />}
            />
            <KPICard
              variant="compact"
              label="Unique Traders (24h)"
              value={latest?.traders ?? 0}
              format={(n) => fmtNum(n)}
              accent="positive"
              icon={<Users className="h-4 w-4" />}
            />
            <KPICard
              variant="compact"
              label="Active Pairs"
              value={activePairsCount}
              format={(n) => fmtNum(n)}
              accent="stablecoin"
              icon={<Layers className="h-4 w-4" />}
            />
            <KPICard
              variant="compact"
              label="DEX TVL (Tracked)"
              value={tvlQ.data?.current_total_usd ?? 0}
              format={(n) => fmtUSD(n)}
              accent="stablecoin"
              icon={<Droplet className="h-4 w-4" />}
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

      {/* Row 2: top pairs + top pools */}
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

        {poolsQ.isPending ? (
          <SkeletonCard variant="table" />
        ) : (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Top Pools by TVL</CardTitle>
                <p className="text-xs text-text-muted mt-1">
                  Liquidity depth across tracked Uniswap V2 pools on Tempo
                </p>
              </div>
            </CardHeader>
            {pools.length === 0 ? (
              <div className="py-10 text-center text-sm text-text-muted">
                No pool data available.
              </div>
            ) : (
              <RankingTable
                columns={poolColumns}
                data={pools}
                rowKey={(r) => r.pair_address}
                showRank
              />
            )}
          </Card>
        )}
      </div>

      {/* Row 3: size histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {swapsLoading ? (
          <SkeletonCard variant="chart" height={320} />
        ) : (
          <Card className="lg:col-span-1">
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
