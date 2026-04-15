import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Compact USD formatter: $1.2K, $3.4M, $5.6B */
export function fmtUSD(
  v: number | null | undefined,
  opts: { decimals?: number; compact?: boolean } = {}
): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const { decimals = 2, compact = true } = opts;
  if (compact && Math.abs(v) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: decimals,
    }).format(v);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: v < 0.01 ? 4 : 2,
    maximumFractionDigits: v < 0.01 ? 6 : decimals,
  }).format(v);
}

/** Compact integer: 1.2K, 3.4M */
export function fmtNum(
  v: number | null | undefined,
  opts: { decimals?: number; compact?: boolean } = {}
): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const { decimals = 1, compact = true } = opts;
  if (compact && Math.abs(v) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: decimals,
    }).format(v);
  }
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: decimals,
  }).format(v);
}

export function fmtPct(
  v: number | null | undefined,
  decimals = 1
): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(decimals)}%`;
}

export function shortAddr(addr: string | null | undefined, head = 6, tail = 4): string {
  if (!addr) return "—";
  if (addr.length <= head + tail + 2) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function pctChange(latest: number, prior: number): number {
  if (!prior || !Number.isFinite(prior)) return 0;
  return ((latest - prior) / prior) * 100;
}
