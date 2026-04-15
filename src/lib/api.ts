import { NextResponse } from "next/server";

/** Standard API response envelope. */
export function jsonOK(data: unknown, range: string, freshness?: string) {
  return NextResponse.json({
    data,
    meta: {
      timestamp: new Date().toISOString(),
      range,
      cache_hit: false,
      freshness: freshness ?? new Date().toISOString(),
    },
  });
}

/** Standard API error response. */
export function jsonErr(msg: string, status = 500) {
  return NextResponse.json({ error: msg }, { status });
}

/** Coerce a Surf row value to number (Float/UInt come back as string or number). */
export function num(v: unknown, fallback = 0): number {
  if (v === null || v === undefined) return fallback;
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}

/** Coerce to string; empty if null/undefined. */
export function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

/** Percent change helper, safe against 0/null prior. */
export function pctChange(latest: number, prior: number): number {
  if (!prior || !Number.isFinite(prior)) return 0;
  return ((latest - prior) / prior) * 100;
}
