"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, ReactNode } from "react";
import {
  Coins,
  TrendingUp,
  ArrowLeftRight,
  Users,
} from "lucide-react";
import { useRangeStore } from "@/lib/store";
import { fetcher } from "@/lib/fetcher";
import { fmtUSD, fmtNum, cn } from "@/lib/utils";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { KPICard } from "@/components/ui/KPICard";
import { TimeseriesChart } from "@/components/charts/TimeseriesChart";
import { RankingTable, RankingColumn } from "@/components/ui/RankingTable";
import { SkeletonCard } from "@/components/ui/SkeletonCard";

interface MetricsTs {
  block_date: string;
  transfers: number;
  volume_usd: number;
  senders: number;
  receivers: number;
  active_tokens: number;
  [key: string]: unknown;
}
interface MetricsData {
  timeseries: MetricsTs[];
  by_token_timeseries: Array<Record<string, string | number>>;
  tokens: string[];
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
interface TopTokensData {
  tokens: TopToken[];
  sort: string;
}

interface PriceToken {
  token_symbol: string;
  price_usd: number;
  volume_usd: number;
  [key: string]: unknown;
}
interface PricePoint {
  block_date: string;
  token_symbol: string;
  price_usd: number;
  volume_usd: number;
}
interface PricesData {
  timeseries: PricePoint[];
  latest: PriceToken[];
}

interface Envelope<T> {
  data: T;
  meta: { freshness: string };
}

const TOKEN_COLORS: Record<string, string> = {
  "USDC.e": "#00CEC9",
  pathUSD: "#6C5CE7",
  USDS: "#2ED573",
  USDT0: "#26A17B",
  WETH: "#627EEA",
  TEMPO: "#FF6B6B",
  WBTC: "#F7931A",
  BEATS: "#FFA801",
};
const PALETTE = ["#6C5CE7", "#00CEC9", "#2ED573", "#FFA801", "#FD7272"];
const colorForToken = (symbol: string, i = 0): string =>
  TOKEN_COLORS[symbol] ?? PALETTE[i % PALETTE.length];

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

export function TokenSection() {
  const range = useRangeStore((s) => s.range);
  const [sortBy, setSortBy] = useState<"transfers" | "volume">("volume");

  const metricsQ = useQuery({
    queryKey: ["token-metrics", range],
    queryFn: () =>
      fetcher<Envelope<MetricsData>>(
        `/api/v1/tempo/tokens/metrics?range=${range}`
      ),
    select: (r) => r.data,
  });

  const topQ = useQuery({
    queryKey: ["tokens-top", range, sortBy],
    queryFn: () =>
      fetcher<Envelope<TopTokensData>>(
        `/api/v1/tempo/tokens/top?range=${range}&sort=${sortBy}`
      ),
    select: (r) => r.data,
  });

  const pricesQ = useQuery({
    queryKey: ["token-prices", range],
    queryFn: () =>
      fetcher<Envelope<PricesData>>(
        `/api/v1/tempo/prices/daily?range=${range}`
      ),
    select: (r) => r.data,
  });

  const ts = metricsQ.data?.timeseries ?? [];
  const metricsLoading = metricsQ.isPending;

  // KPIs from latest day
  const latest = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return [...ts].reverse().find((r) => r.block_date < todayStr) ?? ts[ts.length - 1];
  }, [ts]);

  // Price table data
  const priceTokens = useMemo(() => {
    const rows = pricesQ.data?.latest ?? [];
    // Filter stablecoins out of the price table (they're always ~$1)
    return rows.filter(
      (t) => !["USDC.e", "USDS", "USDT0", "pathUSD", "DAI"].includes(t.token_symbol)
    );
  }, [pricesQ.data]);

  // Per-token volume breakdown chart
  const byTokenTs = metricsQ.data?.by_token_timeseries ?? [];
  const tokens = metricsQ.data?.tokens ?? [];

  const tokenColumns: RankingColumn<TopToken>[] = [
    {
      key: "token_symbol",
      label: "Token",
      format: (v) => (
        <span className="font-semibold text-text-primary">{String(v)}</span>
      ),
    },
    {
      key: "tx_count",
      label: "Transfers",
      align: "right",
      barKey: sortBy === "transfers" ? "tx_count" : undefined,
      format: (v) => fmtNum(Number(v)),
    },
    {
      key: "volume_usd",
      label: "Volume",
      align: "right",
      barKey: sortBy === "volume" ? "volume_usd" : undefined,
      format: (v) => fmtUSD(Number(v)),
    },
    {
      key: "unique_senders",
      label: "Senders",
      align: "right",
      format: (v) => fmtNum(Number(v)),
    },
    {
      key: "avg_transfer_usd",
      label: "Avg Tx",
      align: "right",
      format: (v) => fmtUSD(Number(v)),
    },
  ];

  const priceColumns: RankingColumn<PriceToken>[] = [
    {
      key: "token_symbol",
      label: "Token",
      format: (v) => (
        <span className="font-semibold text-text-primary">{String(v)}</span>
      ),
    },
    {
      key: "price_usd",
      label: "Price",
      align: "right",
      format: (v) => {
        const n = Number(v);
        return n < 0.01
          ? `$${n.toFixed(6)}`
          : n < 1
            ? `$${n.toFixed(4)}`
            : fmtUSD(n, { compact: false });
      },
    },
    {
      key: "volume_usd",
      label: "24h Volume",
      align: "right",
      barKey: "volume_usd",
      format: (v) => fmtUSD(Number(v)),
    },
  ];

  return (
    <section className="space-y-8">
      <SectionHeader
        id="tokens"
        eyebrow="Tokens"
        title="Token Analytics"
        subtitle="Transfer activity, volume breakdown, and DEX-derived prices across the Tempo token ecosystem."
        accent="tempo"
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metricsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} variant="kpi" height={80} />
          ))
        ) : (
          <>
            <KPICard
              variant="compact"
              label="24h Transfers"
              value={latest?.transfers ?? 0}
              format={(n) => fmtNum(n)}
              accent="tempo"
              icon={<ArrowLeftRight className="h-4 w-4" />}
            />
            <KPICard
              variant="compact"
              label="24h Volume"
              value={latest?.volume_usd ?? 0}
              format={(n) => fmtUSD(n)}
              accent="positive"
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <KPICard
              variant="compact"
              label="Active Tokens"
              value={latest?.active_tokens ?? 0}
              format={(n) => fmtNum(n)}
              accent="stablecoin"
              icon={<Coins className="h-4 w-4" />}
            />
            <KPICard
              variant="compact"
              label="Unique Senders"
              value={latest?.senders ?? 0}
              format={(n) => fmtNum(n)}
              accent="tempo"
              icon={<Users className="h-4 w-4" />}
            />
          </>
        )}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Daily Transfer Volume"
          subtitle="USD volume across all TIP-20 tokens"
          loading={metricsLoading}
          empty={!metricsLoading && ts.length === 0}
        >
          <TimeseriesChart
            data={ts}
            xKey="block_date"
            series={[
              {
                key: "volume_usd",
                label: "Volume",
                color: "#6C5CE7",
                type: "area",
              },
            ]}
            yFormatter={(n) => fmtUSD(n)}
            xFormatter={xFmt}
          />
        </ChartCard>

        <ChartCard
          title="Volume by Token (Top 5)"
          subtitle="Daily USD volume per top token"
          loading={metricsLoading}
          empty={!metricsLoading && byTokenTs.length === 0}
        >
          <TimeseriesChart
            data={byTokenTs}
            xKey="block_date"
            stackId="tokens"
            series={tokens.map((t, i) => ({
              key: t,
              label: t,
              color: colorForToken(t, i),
              type: "area" as const,
            }))}
            yFormatter={(n) => fmtUSD(n)}
            xFormatter={xFmt}
            showLegend
          />
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Daily Transfer Count"
          subtitle="Number of TIP-20 transfers per day"
          loading={metricsLoading}
          empty={!metricsLoading && ts.length === 0}
        >
          <TimeseriesChart
            data={ts}
            xKey="block_date"
            series={[
              {
                key: "transfers",
                label: "Transfers",
                color: "#00CEC9",
                type: "bar",
              },
            ]}
            yFormatter={(n) => fmtNum(n)}
            xFormatter={xFmt}
          />
        </ChartCard>

        <ChartCard
          title="Unique Senders & Receivers"
          subtitle="Daily active wallets participating in token transfers"
          loading={metricsLoading}
          empty={!metricsLoading && ts.length === 0}
        >
          <TimeseriesChart
            data={ts}
            xKey="block_date"
            series={[
              { key: "senders", label: "Senders", color: "#6C5CE7" },
              { key: "receivers", label: "Receivers", color: "#2ED573" },
            ]}
            yFormatter={(n) => fmtNum(n)}
            xFormatter={xFmt}
            showLegend
          />
        </ChartCard>
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {topQ.isPending ? (
          <SkeletonCard variant="table" />
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div>
                  <CardTitle>Top Tokens</CardTitle>
                  <p className="text-xs text-text-muted mt-1">
                    Ranked by {sortBy === "volume" ? "transfer volume" : "transfer count"}
                  </p>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-bg-card p-0.5">
                  {(["volume", "transfers"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSortBy(s)}
                      className={cn(
                        "py-1 px-2.5 text-[11px] rounded-full border transition-colors font-medium capitalize",
                        sortBy === s
                          ? "bg-accent-tempo/20 text-accent-tempo border-accent-tempo/40"
                          : "border-border-subtle text-text-secondary hover:text-text-primary"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <RankingTable
              columns={tokenColumns}
              data={topQ.data?.tokens ?? []}
              rowKey={(r) => r.token_symbol}
              showRank
            />
          </Card>
        )}

        {pricesQ.isPending ? (
          <SkeletonCard variant="table" />
        ) : (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Token Prices</CardTitle>
                <p className="text-xs text-text-muted mt-1">
                  DEX-derived prices · excludes stablecoins
                </p>
              </div>
            </CardHeader>
            {priceTokens.length === 0 ? (
              <div className="py-10 text-center text-sm text-text-muted">
                No price data available yet.
              </div>
            ) : (
              <RankingTable
                columns={priceColumns}
                data={priceTokens}
                rowKey={(r) => r.token_symbol}
                showRank
              />
            )}
          </Card>
        )}
      </div>
    </section>
  );
}
