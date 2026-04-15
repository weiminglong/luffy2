"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { cn, fmtNum, shortAddr } from "@/lib/utils";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { SkeletonCard } from "@/components/ui/SkeletonCard";

type WindowValue = "24h" | "7d" | "all";

interface ContractRow {
  rank: number;
  contract_address: string;
  call_count: number;
  total_gas_used: number;
  unique_callers: number;
  label?: string;
}

interface ContractsData {
  window: WindowValue;
  rows: ContractRow[];
}

interface Envelope<T> {
  data: T;
  meta?: { freshness?: string };
}

const WINDOWS: { value: WindowValue; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "all", label: "All" },
];

function CopyButton({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === "undefined") return;
    navigator.clipboard
      .writeText(address)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => undefined);
  };

  return (
    <button
      type="button"
      aria-label="Copy contract address"
      onClick={handleCopy}
      className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border-subtle text-text-muted transition-colors hover:text-text-primary hover:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-tempo"
    >
      {copied ? (
        <Check className="h-3 w-3 text-accent-positive" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

function WindowSelector({
  value,
  onChange,
}: {
  value: WindowValue;
  onChange: (v: WindowValue) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-bg-card p-0.5">
      {WINDOWS.map((w) => {
        const selected = w.value === value;
        return (
          <button
            key={w.value}
            type="button"
            onClick={() => onChange(w.value)}
            className={cn(
              "py-1 px-2.5 text-[11px] rounded-full border transition-colors font-medium",
              selected
                ? "bg-accent-tempo/20 text-accent-tempo border-accent-tempo/40"
                : "border-border-subtle text-text-secondary hover:text-text-primary"
            )}
          >
            {w.label}
          </button>
        );
      })}
    </div>
  );
}

export function EcosystemActivitySection() {
  const [windowValue, setWindowValue] = useState<WindowValue>("7d");

  const { data, isPending: isLoading } = useQuery({
    queryKey: ["contracts-top", windowValue],
    queryFn: () =>
      fetcher<Envelope<ContractsData>>(
        `/api/v1/tempo/contracts/top?window=${windowValue}`
      ),
    select: (r) => r.data,
  });

  const rows = data?.rows ?? [];
  const empty = !isLoading && rows.length === 0;

  return (
    <motion.section
      className="space-y-8"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <SectionHeader
        id="ecosystem-activity"
        eyebrow="ECOSYSTEM"
        title="Top Contracts & Dev Activity"
        subtitle="The apps and protocols driving gas consumption on Tempo."
        accent="positive"
        action={
          <WindowSelector value={windowValue} onChange={setWindowValue} />
        }
      />

      {isLoading ? (
        <SkeletonCard variant="table" />
      ) : empty ? (
        <Card>
          <CardHeader>
            <CardTitle>Top Contracts</CardTitle>
          </CardHeader>
          <div className="py-10 text-center text-sm text-text-muted">
            No contract activity in this window yet. Check back soon.
          </div>
        </Card>
      ) : (
        <Card padding="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="sticky top-0 z-10 bg-bg-card border-b border-border-subtle">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted w-16">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Contract
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Calls
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Gas Used
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Unique Users
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.contract_address}
                    className="group border-b border-border-subtle/40 last:border-0 transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3 align-middle">
                      <span className="font-mono tabular-nums text-accent-tempo text-xs font-semibold">
                        #{row.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="min-w-0 flex-1">
                          {row.label ? (
                            <>
                              <div className="font-semibold text-text-primary truncate">
                                {row.label}
                              </div>
                              <div className="font-mono text-xs text-text-muted truncate">
                                {shortAddr(row.contract_address, 8, 6)}
                              </div>
                            </>
                          ) : (
                            <div className="font-mono text-text-primary">
                              {shortAddr(row.contract_address, 8, 6)}
                            </div>
                          )}
                        </div>
                        <CopyButton address={row.contract_address} />
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle text-right font-mono tabular-nums text-text-primary">
                      {fmtNum(row.call_count)}
                    </td>
                    <td className="px-4 py-3 align-middle text-right">
                      <div className="font-mono tabular-nums text-text-primary">
                        {fmtNum(row.total_gas_used)}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-text-muted">
                        gas
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle text-right font-mono tabular-nums text-text-primary">
                      {fmtNum(row.unique_callers)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </motion.section>
  );
}
