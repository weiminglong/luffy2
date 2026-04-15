"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, ReactNode } from "react";
import { useRangeStore } from "@/lib/store";
import { fetcher } from "@/lib/fetcher";
import { fmtUSD, fmtNum, shortAddr } from "@/lib/utils";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { KPICard } from "@/components/ui/KPICard";
import { TimeseriesChart } from "@/components/charts/TimeseriesChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { BridgeFlowViz } from "@/components/charts/BridgeFlowViz";
import { RankingTable, RankingColumn } from "@/components/ui/RankingTable";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { Coins, Landmark, ArrowLeftRight, Users } from "lucide-react";

interface SupplyTs {
  block_date: string;
  token_symbol: string;
  mint_volume_usd: number;
  burn_volume_usd: number;
  net_supply_change_usd: number;
}
interface SupplyByToken {
  token_symbol: string;
  cumulative_supply_usd: number;
  mint_total: number;
  burn_total: number;
}
interface SupplyData {
  timeseries: SupplyTs[];
  by_token: SupplyByToken[];
  latest_total_supply_usd: number;
}

interface TransfersTs {
  block_date: string;
  tx_count: number;
  unique_senders: number;
  volume_usd: number;
  [key: string]: unknown;
}
interface TopAddress {
  address: string;
  tx_count: number;
  volume_usd: number;
  [key: string]: unknown;
}
interface TransfersData {
  timeseries: TransfersTs[];
  top_senders: TopAddress[];
  top_receivers: TopAddress[];
}

interface BridgeTs {
  block_date: string;
  token_symbol: string;
  inflow_count: number;
  inflow_usd: number;
  outflow_count: number;
  outflow_usd: number;
  net_flow_usd: number;
}
interface BridgeByToken {
  token_symbol: string;
  inflow_usd: number;
  outflow_usd: number;
  net_flow_usd: number;
}
interface BridgeData {
  timeseries: BridgeTs[];
  by_token: BridgeByToken[];
  total_inflow_usd: number;
  total_outflow_usd: number;
  net_flow_usd: number;
  current_supply_by_token: Array<{
    token_symbol: string;
    current_supply_usd: number;
  }>;
  total_current_supply_usd: number;
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

export function StablecoinSection() {
  const range = useRangeStore((s) => s.range);

  const supplyQ = useQuery({
    queryKey: ["stablecoins-supply", range],
    queryFn: () =>
      fetcher<Envelope<SupplyData>>(
        `/api/v1/tempo/stablecoins/supply?range=${range}`
      ),
    select: (r) => r.data,
  });

  const transfersQ = useQuery({
    queryKey: ["stablecoins-transfers", range],
    queryFn: () =>
      fetcher<Envelope<TransfersData>>(
        `/api/v1/tempo/stablecoins/transfers?range=${range}`
      ),
    select: (r) => r.data,
  });

  const bridgeQ = useQuery({
    queryKey: ["bridge-flows", range],
    queryFn: () =>
      fetcher<Envelope<BridgeData>>(`/api/v1/tempo/bridge/flows?range=${range}`),
    select: (r) => r.data,
  });

  const supplyLoading = supplyQ.isPending;
  const transfersLoading = transfersQ.isPending;
  const bridgeLoading = bridgeQ.isPending;

  // KPI strip values. Total supply is derived from all-time bridge net flows
  // (authoritative) rather than the stablecoin_supply table which
  // under-reports.
  const totalSupply = bridgeQ.data?.total_current_supply_usd ?? 0;
  const netBridge = bridgeQ.data?.net_flow_usd ?? 0;

  const latestTransfer = transfersQ.data?.timeseries?.slice(-1)[0];
  const latestTransferTxs = latestTransfer?.tx_count ?? 0;
  const latestUniqueSenders = latestTransfer?.unique_senders ?? 0;

  // Donut: supply by token from bridge-derived current balances.
  const donutData = useMemo(
    () =>
      (bridgeQ.data?.current_supply_by_token ?? []).map((t) => ({
        name: t.token_symbol,
        value: Math.max(0, t.current_supply_usd),
        color: colorForToken(t.token_symbol),
      })),
    [bridgeQ.data]
  );

  // Cumulative supply over time, derived from bridge daily net flows
  // (authoritative). Pivot by token and compute a running sum, clamped at 0
  // so a short-term negative blip cannot flip the stack.
  const cumulativeData = useMemo(() => {
    const ts = bridgeQ.data?.timeseries ?? [];
    if (ts.length === 0) return { rows: [], tokens: [] as string[] };
    const dates = Array.from(new Set(ts.map((r) => r.block_date))).sort();
    const tokens = Array.from(new Set(ts.map((r) => r.token_symbol)));
    const running: Record<string, number> = Object.fromEntries(
      tokens.map((t) => [t, 0])
    );
    const byDateByToken: Record<string, Record<string, number>> = {};
    for (const r of ts) {
      byDateByToken[r.block_date] ??= {};
      byDateByToken[r.block_date][r.token_symbol] =
        (byDateByToken[r.block_date][r.token_symbol] ?? 0) + r.net_flow_usd;
    }
    const rows = dates.map((d) => {
      const row: Record<string, string | number> = { block_date: d };
      for (const t of tokens) {
        running[t] += byDateByToken[d]?.[t] ?? 0;
        row[t] = Math.max(0, running[t]);
      }
      return row;
    });
    return { rows, tokens };
  }, [bridgeQ.data]);

  // Transfers timeseries
  const transfersTs = transfersQ.data?.timeseries ?? [];

  const bridgeByToken = useMemo(
    () =>
      (bridgeQ.data?.by_token ?? []).filter(
        (t) => t.inflow_usd > 0 || t.outflow_usd > 0
      ),
    [bridgeQ.data]
  );

  const dailyNetFlow = useMemo(() => {
    const rows = bridgeQ.data?.timeseries ?? [];
    const map: Record<string, number> = {};
    for (const r of rows) {
      map[r.block_date] = (map[r.block_date] ?? 0) + r.net_flow_usd;
    }
    return Object.keys(map)
      .sort()
      .map((d) => ({
        block_date: d,
        net_flow_usd: map[d],
        positive: map[d] >= 0 ? map[d] : 0,
        negative: map[d] < 0 ? map[d] : 0,
      }));
  }, [bridgeQ.data]);

  const addrColumns: RankingColumn<TopAddress>[] = [
    {
      key: "address",
      label: "Address",
      format: (v) => (
        <span className="font-mono text-text-primary">
          {shortAddr(String(v))}
        </span>
      ),
    },
    {
      key: "tx_count",
      label: "Txs",
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
  ];

  return (
    <section className="space-y-8">
      <SectionHeader
        id="stablecoins"
        eyebrow="Stablecoins"
        title="Stablecoin Ecosystem"
        subtitle="Supply, bridge flows, and on-chain transfers across USDC.e, pathUSD, and USDS."
        accent="stablecoin"
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {supplyLoading || bridgeLoading || transfersLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} variant="kpi" height={80} />
          ))
        ) : (
          <>
            <KPICard
              variant="compact"
              label="Total Supply"
              value={totalSupply}
              format={(n) => fmtUSD(n)}
              accent="stablecoin"
              icon={<Coins className="h-4 w-4" />}
            />
            <KPICard
              variant="compact"
              label="Net Bridge Flow"
              value={netBridge}
              format={(n) => fmtUSD(n)}
              accent={netBridge >= 0 ? "positive" : "negative"}
              icon={<Landmark className="h-4 w-4" />}
            />
            <KPICard
              variant="compact"
              label="24h Stablecoin Transfers"
              value={latestTransferTxs}
              format={(n) => fmtNum(n)}
              accent="tempo"
              icon={<ArrowLeftRight className="h-4 w-4" />}
            />
            <KPICard
              variant="compact"
              label="Unique Stablecoin Users"
              value={latestUniqueSenders}
              format={(n) => fmtNum(n)}
              accent="positive"
              icon={<Users className="h-4 w-4" />}
            />
          </>
        )}
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard
          title="Supply by Token"
          subtitle="Cumulative net supply breakdown"
          loading={supplyLoading}
          empty={!supplyLoading && donutData.length === 0}
        >
          <DonutChart
            data={donutData}
            valueFormatter={(n) => fmtUSD(n)}
            centerLabel="Total Supply"
            centerValue={fmtUSD(totalSupply)}
            height={240}
          />
        </ChartCard>

        <ChartCard
          title="Cumulative Supply Over Time"
          subtitle="Running net supply per stablecoin"
          loading={supplyLoading}
          empty={!supplyLoading && cumulativeData.rows.length === 0}
        >
          <TimeseriesChart
            data={cumulativeData.rows}
            xKey="block_date"
            stackId="supply"
            series={cumulativeData.tokens.map((t) => ({
              key: t,
              label: t,
              color: colorForToken(t),
              type: "area",
            }))}
            yFormatter={(n) => fmtUSD(n)}
            xFormatter={xFmt}
            showLegend
          />
        </ChartCard>

        <ChartCard
          title="Daily Stablecoin Transfers"
          subtitle="On-chain transfer count per day"
          loading={transfersLoading}
          empty={!transfersLoading && transfersTs.length === 0}
        >
          <TimeseriesChart
            data={transfersTs}
            xKey="block_date"
            series={[
              { key: "tx_count", label: "Transfers", color: "#2ED573", type: "bar" },
            ]}
            yFormatter={(n) => fmtNum(n)}
            xFormatter={xFmt}
          />
        </ChartCard>
      </div>

      {/* Bridge flows */}
      <div className="grid grid-cols-1 gap-6">
        {bridgeLoading ? (
          <SkeletonCard variant="chart" height={420} />
        ) : (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Bridge Flows</CardTitle>
                <p className="text-xs text-text-muted mt-1">
                  External ↔ Tempo stablecoin bridge volume, by token
                </p>
              </div>
            </CardHeader>
            {bridgeByToken.length === 0 ? (
              <div className="py-10 text-center text-sm text-text-muted">
                No bridge data in this range.
              </div>
            ) : (
              <div className="space-y-6">
                <BridgeFlowViz
                  data={bridgeByToken}
                  valueFormatter={(n) => fmtUSD(n)}
                  colorForToken={colorForToken}
                />
                <div className="pt-4 border-t border-border-subtle">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-3">
                    Daily Net Flow
                  </div>
                  <TimeseriesChart
                    data={dailyNetFlow}
                    xKey="block_date"
                    series={[
                      {
                        key: "positive",
                        label: "Net Inflow",
                        color: "#2ED573",
                        type: "bar",
                      },
                      {
                        key: "negative",
                        label: "Net Outflow",
                        color: "#FD7272",
                        type: "bar",
                      },
                    ]}
                    yFormatter={(n) => fmtUSD(n)}
                    xFormatter={xFmt}
                    height={200}
                  />
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {transfersLoading ? (
          <>
            <SkeletonCard variant="table" />
            <SkeletonCard variant="table" />
          </>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Top Stablecoin Senders (7d)</CardTitle>
              </CardHeader>
              <RankingTable
                columns={addrColumns}
                data={transfersQ.data?.top_senders ?? []}
                rowKey={(r) => r.address}
                showRank
              />
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top Stablecoin Receivers (7d)</CardTitle>
              </CardHeader>
              <RankingTable
                columns={addrColumns}
                data={transfersQ.data?.top_receivers ?? []}
                rowKey={(r) => r.address}
                showRank
              />
            </Card>
          </>
        )}
      </div>
    </section>
  );
}
