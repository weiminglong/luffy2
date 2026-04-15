"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useRangeStore } from "@/lib/store";
import { fetcher } from "@/lib/fetcher";
import { fmtUSD, fmtNum } from "@/lib/utils";
import { KPICard } from "@/components/ui/KPICard";
import { SkeletonCard } from "@/components/ui/SkeletonCard";

interface KPI {
  value: number;
  prior: number;
  change_pct: number;
}

interface OverviewData {
  dau: KPI;
  txs: KPI;
  fees: KPI;
  dex_volume: KPI;
  dex_swaps: KPI;
  stablecoin_supply: KPI;
  latest_date: string;
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

  const d = overviewQ.data;
  const s = secondaryQ.data;

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

        {/* Hero KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {overviewQ.isLoading || !d ? (
            Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} variant="kpi" height={180} />
            ))
          ) : (
            <>
              <KPICard
                variant="hero"
                label="Daily Active Users"
                value={d.dau.value}
                delta={d.dau.change_pct}
                format={(n) => fmtNum(n)}
                accent="tempo"
              />
              <KPICard
                variant="hero"
                label="24h Transactions"
                value={d.txs.value}
                delta={d.txs.change_pct}
                format={(n) => fmtNum(n)}
                accent="positive"
              />
              <KPICard
                variant="hero"
                label="Stablecoin Supply"
                value={d.stablecoin_supply.value}
                delta={d.stablecoin_supply.change_pct}
                format={(n) => fmtUSD(n)}
                accent="stablecoin"
              />
              <KPICard
                variant="hero"
                label="24h DEX Volume"
                value={d.dex_volume.value}
                delta={d.dex_volume.change_pct}
                format={(n) => fmtUSD(n)}
                accent="tempo"
              />
            </>
          )}
        </div>

        {/* Secondary strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto">
          {secondaryQ.isLoading || !s ? (
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
              />
              <KPICard
                variant="compact"
                label="MAU"
                value={s.mau}
                format={(n) => fmtNum(n)}
                accent="tempo"
              />
              <KPICard
                variant="compact"
                label="New Users"
                value={s.new_users}
                format={(n) => fmtNum(n)}
                accent="positive"
              />
              <KPICard
                variant="compact"
                label="Sponsored Tx %"
                value={s.sponsored_fee_pct}
                format={(n) => `${n.toFixed(1)}%`}
                accent="stablecoin"
              />
              <KPICard
                variant="compact"
                label="24h MPP Volume"
                value={s.mpp_volume_24h}
                format={(n) => fmtUSD(n)}
                accent="stablecoin"
              />
              <KPICard
                variant="compact"
                label="Active Merchants"
                value={s.active_merchants}
                format={(n) => fmtNum(n)}
                accent="positive"
              />
            </>
          )}
        </div>

        <div className="flex items-center justify-between pt-4">
          <div className="text-xs text-text-muted">
            {d?.latest_date
              ? `Data fresh as of ${d.latest_date}`
              : "Loading latest data…"}
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
