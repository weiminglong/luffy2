"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  ChevronDown,
  CalendarDays,
  UsersRound,
  UserPlus,
  HandCoins,
  ShoppingBag,
  Store,
} from "lucide-react";
import { motion } from "framer-motion";
import { useRangeStore } from "@/lib/store";
import { fetcher } from "@/lib/fetcher";
import { fmtUSD, fmtNum } from "@/lib/utils";
import { KPICard } from "@/components/ui/KPICard";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { LiveIndicator } from "@/components/ui/LiveIndicator";

interface KPI {
  value: number;
  prior: number;
  change_pct: number;
}

interface OverviewData {
  dau: KPI;
  txs: KPI;
  fees: KPI;
  stablecoin_supply: KPI;
  latest_date: string;
}

/** Return delta for display, or undefined when the comparison is meaningless. */
function safeDelta(kpi: KPI): number | undefined {
  if (kpi.prior === 0) return undefined;
  const pct = kpi.change_pct;
  if (!Number.isFinite(pct) || Math.abs(pct) > 500) return undefined;
  return pct;
}

interface SecondaryData {
  wau: number;
  mau: number;
  new_users: number;
  sponsored_fee_pct: number;
  mpp_volume_24h: number;
  active_merchants: number;
  latest_date: string;
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

interface HealthPoint {
  block_date: string;
  dau: number;
  total_txs: number;
  total_fees_usd: number;
  dex_volume_usd: number;
  stablecoin_transfer_volume: number;
  [key: string]: unknown;
}
interface HealthEnvelope {
  data: { timeseries: HealthPoint[] };
}

function toSpark(series: HealthPoint[], key: keyof HealthPoint, tailN = 14): number[] {
  const tail = series.slice(-tailN);
  return tail.map((p) => {
    const v = p[key];
    return typeof v === "number" && Number.isFinite(v) ? v : 0;
  });
}

export function HeroSection() {
  const range = useRangeStore((s) => s.range);

  const overviewQ = useQuery({
    queryKey: ["overview", range],
    queryFn: () =>
      fetcher<Envelope<OverviewData>>(`/api/v1/tempo/overview?range=${range}`),
    select: (r) => r.data,
  });

  const secondaryQ = useQuery({
    queryKey: ["overview-secondary", range],
    queryFn: () =>
      fetcher<Envelope<SecondaryData>>(
        `/api/v1/tempo/overview/secondary?range=${range}`
      ),
    select: (r) => r.data,
  });

  const healthQ = useQuery({
    queryKey: ["chain-health", range],
    queryFn: () =>
      fetcher<HealthEnvelope>(`/api/v1/tempo/chain/health?range=${range}`),
    select: (r) => r.data,
  });

  const lifetimeQ = useQuery({
    queryKey: ["lifetime"],
    queryFn: () => fetcher<Envelope<LifetimeData>>(`/api/v1/tempo/lifetime`),
    select: (r) => r.data,
  });

  const d = overviewQ.data;
  const s = secondaryQ.data;

  const sparklines = useMemo(() => {
    const ts = healthQ.data?.timeseries ?? [];
    return {
      dau: toSpark(ts, "dau"),
      txs: toSpark(ts, "total_txs"),
      stablecoin: toSpark(ts, "stablecoin_transfer_volume"),
      fees: toSpark(ts, "total_fees_usd"),
    };
  }, [healthQ.data]);

  return (
    <section
      id="hero"
      className="relative min-h-[88vh] flex flex-col justify-center py-12 scroll-mt-24"
    >
      <div
        className="pointer-events-none absolute inset-0 dot-grid-bg opacity-40"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(108,92,231,0.5), transparent 70%)",
        }}
        aria-hidden
      />

      <div className="relative space-y-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-5"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-positive/30 bg-accent-positive/10 px-3 py-1 text-xs font-medium text-accent-positive">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 inline-flex h-full w-full animate-ping rounded-full bg-accent-positive opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-positive" />
            </span>
            Live
          </div>

          <h1 className="font-display text-[44px] md:text-[56px] leading-[1.05] font-bold tracking-tight text-text-primary max-w-4xl text-balance">
            Tempo Benchmark Dashboard
          </h1>

          <p className="max-w-2xl text-base md:text-lg text-text-secondary">
            Real-time on-chain analytics for Tempo, benchmarked against
            Ethereum, Base, and Arbitrum. Powered by Surf.
          </p>
        </motion.div>

        {/* Lifetime strip */}
        {lifetimeQ.data ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border-subtle bg-bg-card/60 px-4 py-3 text-[13px] tabular-nums"
          >
            <span className="uppercase tracking-wider text-text-muted">Lifetime</span>
            <span className="text-text-muted/40">·</span>
            <span className="text-text-secondary">
              <span className="text-text-primary font-semibold">
                {fmtNum(lifetimeQ.data.cumulative_users)}
              </span>{" "}
              users
            </span>
            <span className="text-text-muted/40">·</span>
            <span
              className="text-text-secondary"
              title="All transactions on Tempo including system/batched ops"
            >
              <span className="text-text-primary font-semibold">
                {fmtNum(lifetimeQ.data.cumulative_total_txs)}
              </span>{" "}
              total txs
            </span>
            <span className="text-text-muted/40">·</span>
            <span
              className="text-text-secondary"
              title="User-originated transactions only"
            >
              <span className="text-text-primary font-semibold">
                {fmtNum(lifetimeQ.data.cumulative_user_txs)}
              </span>{" "}
              user txs
            </span>
            <span className="text-text-muted/40">·</span>
            <span className="text-text-secondary">
              <span className="text-text-primary font-semibold">
                {fmtUSD(lifetimeQ.data.cumulative_fees_usd)}
              </span>{" "}
              fees earned
            </span>
            <span className="text-text-muted/40">·</span>
            <span className="text-text-secondary">
              <span className="text-text-primary font-semibold">
                {fmtNum(lifetimeQ.data.cumulative_deployments)}
              </span>{" "}
              contracts deployed
            </span>
          </motion.div>
        ) : (
          <div className="h-10 rounded-xl border border-border-subtle bg-bg-card/40 animate-pulse" />
        )}

        {/* Hero KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {overviewQ.isPending || !d ? (
            Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} variant="kpi" height={180} />
            ))
          ) : (
            <>
              <KPICard
                variant="hero"
                label="Daily Active Users"
                value={d.dau.value}
                delta={safeDelta(d.dau)}
                format={(n) => fmtNum(n)}
                accent="tempo"
                sparkline={sparklines.dau}
              />
              <KPICard
                variant="hero"
                label="24h Transactions"
                value={d.txs.value}
                delta={safeDelta(d.txs)}
                format={(n) => fmtNum(n)}
                accent="positive"
                sparkline={sparklines.txs}
              />
              <KPICard
                variant="hero"
                label="Stablecoin Supply"
                value={d.stablecoin_supply.value}
                delta={safeDelta(d.stablecoin_supply)}
                format={(n) => fmtUSD(n)}
                accent="stablecoin"
                sparkline={sparklines.stablecoin}
              />
              <KPICard
                variant="hero"
                label="24h Fees"
                value={d.fees.value}
                delta={safeDelta(d.fees)}
                format={(n) => fmtUSD(n)}
                accent="positive"
                sparkline={sparklines.fees}
              />
            </>
          )}
        </div>

        {/* Secondary strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto">
          {secondaryQ.isPending || !s ? (
            Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} variant="kpi" height={80} />
            ))
          ) : (
            <>
              <KPICard
                variant="compact"
                label="WAU"
                value={s.wau}
                format={(n) => fmtNum(n)}
                accent="tempo"
                icon={<CalendarDays className="h-4 w-4" />}
              />
              <KPICard
                variant="compact"
                label="MAU"
                value={s.mau}
                format={(n) => fmtNum(n)}
                accent="tempo"
                icon={<UsersRound className="h-4 w-4" />}
              />
              <KPICard
                variant="compact"
                label="New Users"
                value={s.new_users}
                format={(n) => fmtNum(n)}
                accent="positive"
                icon={<UserPlus className="h-4 w-4" />}
              />
              <KPICard
                variant="compact"
                label="Sponsored Tx %"
                value={s.sponsored_fee_pct}
                format={(n) => `${n.toFixed(1)}%`}
                accent="stablecoin"
                icon={<HandCoins className="h-4 w-4" />}
              />
              <KPICard
                variant="compact"
                label="24h MPP Volume"
                value={s.mpp_volume_24h}
                format={(n) => fmtUSD(n)}
                accent="stablecoin"
                icon={<ShoppingBag className="h-4 w-4" />}
              />
              <KPICard
                variant="compact"
                label="Active Merchants"
                value={s.active_merchants}
                format={(n) => fmtNum(n)}
                accent="positive"
                icon={<Store className="h-4 w-4" />}
              />
            </>
          )}
        </div>

        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <LiveIndicator />
            {d?.latest_date ? (
              <span className="hidden sm:inline text-text-muted">
                · Block date {d.latest_date} (UTC)
              </span>
            ) : null}
          </div>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            className="text-text-muted"
            aria-hidden
          >
            <ChevronDown className="h-5 w-5" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
