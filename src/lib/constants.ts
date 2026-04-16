/** Tempo mainnet launch date (UTC). */
export const TEMPO_LAUNCH_DATE = "2026-03-18";

/** Days since Tempo mainnet launch. */
export function tempoAgeDays(): number {
  const launch = new Date(TEMPO_LAUNCH_DATE + "T00:00:00Z");
  return Math.max(1, Math.floor((Date.now() - launch.getTime()) / 86_400_000));
}

/** Known data gap: data from this range is being backfilled and is incomplete. */
export const DATA_GAP_START = "2026-03-29";
export const DATA_GAP_END = "2026-04-08";

/** Check if a YYYY-MM-DD date falls in the known data gap. */
export function isInDataGap(date: string): boolean {
  return date >= DATA_GAP_START && date <= DATA_GAP_END;
}
