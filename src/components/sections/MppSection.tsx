"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { useRangeStore } from "@/lib/store";
import { fetcher } from "@/lib/fetcher";
import { fmtUSD, fmtNum, shortAddr } from "@/lib/utils";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { KPICard } from "@/components/ui/KPICard";
import { TimeseriesChart } from "@/components/charts/TimeseriesChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { RankingTable, RankingColumn } from "@/components/ui/RankingTable";
import { LiveFeed } from "@/components/ui/LiveFeed";
import { SkeletonCard } from "@/components/ui/SkeletonCard";

interface MetricTs {
  block_date: string;
  token_symbol: string;
  payment_count: number;
  volume_usd: number;
  avg_payment_usd: number;
  median_payment_usd: number;
  unique_payers: number;
  unique_payees: number;
}
interface MppByToken {
  token_symbol: string;
  payment_count: number;
  volume_usd: number;
  unique_payers: number;
}
interface MetricsData {
  timeseries: MetricTs[];
  by_token: MppByToken[];
}

interface Merchant {
  payee: string;
  payments: number;
  volume_usd: number;
  unique_payers: number;
  [key: string]: unknown;
}
interface MerchantTs {
  block_date: string;
  active_merchants: number;
  [key: string]: unknown;
}
interface MerchantsData {
  top_merchants: Merchant[];
  merchants_timeseries: MerchantTs[];
}

interface Payment {
  block_date: string;
  transaction_hash: string;
  transfer_from: string;
  transfer_to: string;
  token_symbol: string;
  amount_usd: number;
  memo: string;
  memo_hex: string;
}
interface FeedData {
  payments: Payment[];
}

interface Envelope<T> {
  data: T;
  meta: { freshness: string };
}

const TOKEN_COLORS: Record<string, string> = {
  "USDC.e": "#00CEC9",
  pathUSD: "#6C5CE7",
  USDS: "#2ED573",
};

const colorForToken = (symbol: string): string =>
  TOKEN_COLORS[symbol] ?? "#FFA801";

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

function truncate(s: string, n: number) {
  if (!s) return "";
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
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

export function MppSection() {
  const range = useRangeStore((s) => s.range);

  const metricsQ = useQuery({
    queryKey: ["mpp-metrics", range],
    queryFn: () =>
      fetcher<Envelope<MetricsData>>(
        `/api/v1/tempo/mpp/metrics?range=${range}`
      ),
    select: (r) => r.data,
  });

  const merchantsQ = useQuery({
    queryKey: ["mpp-merchants", range],
    queryFn: () =>
      fetcher<Envelope<MerchantsData>>(
        `/api/v1/tempo/mpp/merchants?range=${range}`
      ),
    select: (r) => r.data,
  });

  const feedQ = useQuery({
    queryKey: ["mpp-feed"],
    queryFn: () => fetcher<Envelope<FeedData>>(`/api/v1/tempo/mpp/feed`),
    select: (r) => r.data,
    refetchInterval: 60_000,
  });

  const ts = metricsQ.data?.timeseries ?? [];
  const byToken = metricsQ.data?.by_token ?? [];
  const merchants = merchantsQ.data?.top_merchants ?? [];
  const merchantsTs = merchantsQ.data?.merchants_timeseries ?? [];
  const payments = feedQ.data?.payments ?? [];

  // Pivot volume by date/token
  const { volumeRows, countRows, tokens } = useMemo(() => {
    const dates = Array.from(new Set(ts.map((r) => r.block_date))).sort();
    const tokens = Array.from(new Set(ts.map((r) => r.token_symbol)));
    const volMap: Record<string, Record<string, number>> = {};
    const cntMap: Record<string, number> = {};
    for (const r of ts) {
      volMap[r.block_date] ??= {};
      volMap[r.block_date][r.token_symbol] =
        (volMap[r.block_date][r.token_symbol] ?? 0) + r.volume_usd;
      cntMap[r.block_date] = (cntMap[r.block_date] ?? 0) + r.payment_count;
    }
    const volumeRows = dates.map((d) => {
      const row: Record<string, string | number> = { block_date: d };
      for (const t of tokens) row[t] = volMap[d]?.[t] ?? 0;
      return row;
    });
    const countRows = dates.map((d) => ({
      block_date: d,
      payment_count: cntMap[d] ?? 0,
    }));
    return { volumeRows, countRows, tokens };
  }, [ts]);

  // KPIs
  const latestDate = ts.length ? ts[ts.length - 1].block_date : null;
  const latestDayRows = latestDate
    ? ts.filter((r) => r.block_date === latestDate)
    : [];
  const latestVolume = latestDayRows.reduce((s, r) => s + r.volume_usd, 0);
  const latestCount = latestDayRows.reduce((s, r) => s + r.payment_count, 0);
  const activeMerchantsLatest =
    merchantsTs[merchantsTs.length - 1]?.active_merchants ?? 0;
  const avgTicket = latestCount > 0 ? latestVolume / latestCount : 0;

  const donutData = useMemo(
    () =>
      byToken.map((t) => ({
        name: t.token_symbol,
        value: Math.max(0, t.volume_usd),
        color: colorForToken(t.token_symbol),
      })),
    [byToken]
  );

  const merchantColumns: RankingColumn<Merchant>[] = [
    {
      key: "payee",
      label: "Merchant",
      format: (v) => (
        <span className="font-mono text-text-primary">
          {shortAddr(String(v))}
        </span>
      ),
    },
    {
      key: "payments",
      label: "Payments",
      align: "right",
      format: (v) => fmtNum(Number(v)),
    },
    {
      key: "volume_usd",
      label: "Volume",
      align: "right",
      barKey: "volume_usd",
      format: (v) => fmtUSD(Number(v)),
    },
    {
      key: "unique_payers",
      label: "Payers",
      align: "right",
      format: (v) => fmtNum(Number(v)),
    },
  ];

  const metricsLoading = metricsQ.isLoading;
  const merchantsLoading = merchantsQ.isLoading;
  const feedLoading = feedQ.isLoading;

  return (
    <section className="space-y-8">
      <SectionHeader
        id="merchants"
        eyebrow="Payments (MPP)"
        title="Merchant Payment Protocol"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metricsLoading || merchantsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} variant="kpi" height={80} />
          ))
        ) : (
          <>
            <KPICard
              variant="compact"
              label="24h Payment Volume"
              value={latestVolume}
              format={(n) => fmtUSD(n)}
              accent="tempo"
            />
            <KPICard
              variant="compact"
              label="24h Payment Count"
              value={latestCount}
              format={(n) => fmtNum(n)}
              accent="positive"
            />
            <KPICard
              variant="compact"
              label="Active Merchants"
              value={activeMerchantsLatest}
              format={(n) => fmtNum(n)}
              accent="stablecoin"
            />
            <KPICard
              variant="compact"
              label="Avg Ticket Size"
              value={avgTicket}
              format={(n) => fmtUSD(n, { decimals: 2 })}
              accent="tempo"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard
          title="Payment Volume"
          subtitle="Stacked by token"
          loading={metricsLoading}
          empty={!metricsLoading && volumeRows.length === 0}
        >
          <TimeseriesChart
            data={volumeRows}
            xKey="block_date"
            stackId="mpp-vol"
            series={tokens.map((t) => ({
              key: t,
              label: t,
              color: colorForToken(t),
              type: "bar",
            }))}
            yFormatter={(n) => fmtUSD(n)}
            xFormatter={xFmt}
            showLegend
          />
        </ChartCard>

        <ChartCard
          title="Payment Count"
          loading={metricsLoading}
          empty={!metricsLoading && countRows.length === 0}
        >
          <TimeseriesChart
            data={countRows}
            xKey="block_date"
            series={[
              {
                key: "payment_count",
                label: "Payments",
                color: "#00CEC9",
              },
            ]}
            yFormatter={(n) => fmtNum(n)}
            xFormatter={xFmt}
          />
        </ChartCard>

        <ChartCard
          title="Token Mix"
          subtitle="Volume share by stablecoin"
          loading={metricsLoading}
          empty={!metricsLoading && donutData.length === 0}
        >
          <DonutChart
            data={donutData}
            valueFormatter={(n) => fmtUSD(n)}
            centerLabel="Total"
            centerValue={fmtUSD(donutData.reduce((s, d) => s + d.value, 0))}
            height={240}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {merchantsLoading ? (
          <SkeletonCard variant="table" />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Top Merchants (window)</CardTitle>
            </CardHeader>
            <RankingTable
              columns={merchantColumns}
              data={merchants}
              rowKey={(r) => r.payee}
              showRank
            />
          </Card>
        )}

        <ChartCard
          title="Active Merchants"
          subtitle="Unique payees per day"
          loading={merchantsLoading}
          empty={!merchantsLoading && merchantsTs.length === 0}
        >
          <TimeseriesChart
            data={merchantsTs}
            xKey="block_date"
            series={[
              {
                key: "active_merchants",
                label: "Merchants",
                color: "#2ED573",
              },
            ]}
            yFormatter={(n) => fmtNum(n)}
            xFormatter={xFmt}
          />
        </ChartCard>
      </div>

      {feedLoading ? (
        <SkeletonCard variant="feed" />
      ) : (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent Payments</CardTitle>
              <p className="text-xs text-text-muted mt-1">
                Live feed — refreshes every 60s
              </p>
            </div>
          </CardHeader>
          <LiveFeed
            items={payments}
            itemKey={(p, i) => `${p.transaction_hash}-${i}`}
            emptyText="No recent payments."
            renderItem={(p) => (
              <div className="rounded-xl border border-border-subtle/60 bg-bg-card-hover/30 p-3 text-sm hover:border-border-strong transition-colors space-y-1">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-text-muted w-16 shrink-0">
                      {relativeTime(p.block_date)}
                    </span>
                    <div className="flex items-center gap-1.5 font-mono text-xs min-w-0">
                      <span className="text-text-secondary">
                        {shortAddr(p.transfer_from)}
                      </span>
                      <ArrowRight
                        className="h-3 w-3 text-text-muted shrink-0"
                        aria-hidden
                      />
                      <span className="text-text-primary">
                        {shortAddr(p.transfer_to)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="num font-mono text-text-primary">
                      {fmtUSD(p.amount_usd)}
                    </span>
                    <span
                      className="rounded-full border border-border-subtle bg-bg-card px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold"
                      style={{ color: colorForToken(p.token_symbol) }}
                    >
                      {p.token_symbol || "?"}
                    </span>
                  </div>
                </div>
                {p.memo && p.memo !== p.memo_hex ? (
                  <div className="italic text-xs text-text-muted pl-[76px]">
                    “{truncate(p.memo, 60)}”
                  </div>
                ) : null}
              </div>
            )}
          />
        </Card>
      )}
    </section>
  );
}
