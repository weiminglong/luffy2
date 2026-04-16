/**
 * Surf onchain-sql wrapper.
 *
 * Calls the Surf API directly via HTTP — no CLI binary needed.
 * Works on any platform (Vercel, Docker, local dev).
 *
 * Date columns come back as Unix epoch seconds — callers should
 * convert via `epochToDate()` when needed.
 */

const SURF_API_BASE =
  process.env.SURF_API_BASE || "https://api.asksurf.ai/gateway";
const SURF_API_KEY = process.env.SURF_API_KEY || "";
const MAX_CONCURRENT = Number(process.env.SURF_MAX_CONCURRENT || 3);
const SURF_TIMEOUT_MS = Number(process.env.SURF_TIMEOUT_MS || 60_000);
const SURF_MIN_START_GAP_MS = Number(process.env.SURF_MIN_START_GAP_MS || 750);
const SURF_RATE_LIMIT_RETRIES = Number(process.env.SURF_RATE_LIMIT_RETRIES || 3);
const SURF_RATE_LIMIT_BASE_DELAY_MS = Number(
  process.env.SURF_RATE_LIMIT_BASE_DELAY_MS || 1_000
);

export type SurfRow = Record<string, string | number | boolean | null>;

interface CacheEntry {
  expiresAt: number;
  data: SurfRow[];
}

interface SurfState {
  cache: Map<string, CacheEntry>;
  inflight: Map<string, Promise<SurfRow[]>>;
  active: number;
  waiters: Array<() => void>;
  nextStartAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __tempoSurfState__: SurfState | undefined;
}

function getSurfState(): SurfState {
  if (!globalThis.__tempoSurfState__) {
    globalThis.__tempoSurfState__ = {
      cache: new Map<string, CacheEntry>(),
      inflight: new Map<string, Promise<SurfRow[]>>(),
      active: 0,
      waiters: [],
      nextStartAt: 0,
    };
  }
  return globalThis.__tempoSurfState__;
}

/** Simple FIFO concurrency limiter. */
async function gate(state: SurfState): Promise<() => void> {
  if (state.active >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => state.waiters.push(resolve));
  }
  state.active++;
  return () => {
    state.active--;
    const next = state.waiters.shift();
    if (next) next();
  };
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function isSurfRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("RATE_LIMITED") || msg.includes("429");
}

function rateLimitDelayMs(attempt: number, baseDelayMs: number): number {
  return baseDelayMs * 2 ** Math.max(0, attempt - 1);
}

interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

export async function runWithSurfRateLimitRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const {
    retries = SURF_RATE_LIMIT_RETRIES,
    baseDelayMs = SURF_RATE_LIMIT_BASE_DELAY_MS,
    sleep: sleepFn = sleep,
  } = opts;

  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (!isSurfRateLimitError(err) || attempt > retries) {
        throw err;
      }
      await sleepFn(rateLimitDelayMs(attempt, baseDelayMs));
    }
  }
}

export function parseSurfJson(raw: string): SurfRow[] {
  const parsed = JSON.parse(raw) as SurfRow[] | unknown;
  return Array.isArray(parsed) ? parsed : [];
}

async function reserveStartSlot(state: SurfState): Promise<void> {
  const now = Date.now();
  const startAt = Math.max(now, state.nextStartAt);
  state.nextStartAt = startAt + SURF_MIN_START_GAP_MS;
  await sleep(startAt - now);
}

export interface QueryOptions {
  /** Cache TTL in seconds. 0 disables cache. */
  ttl?: number;
  /** Max rows (1..10000). Default 1000. */
  maxRows?: number;
  /** Override cache key. Defaults to SQL string. */
  cacheKey?: string;
}

export async function querySurf(
  sql: string,
  opts: QueryOptions = {}
): Promise<SurfRow[]> {
  const { ttl = 300, maxRows = 1000, cacheKey } = opts;
  const key = cacheKey ?? `${maxRows}::${sql}`;
  const state = getSurfState();

  if (ttl > 0) {
    const cached = state.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
  }

  const existing = state.inflight.get(key);
  if (existing) return existing;

  const promise = runSurf(sql, maxRows)
    .then((data) => {
      if (ttl > 0) {
        state.cache.set(key, { expiresAt: Date.now() + ttl * 1000, data });
      }
      state.inflight.delete(key);
      return data;
    })
    .catch((err) => {
      state.inflight.delete(key);
      throw err;
    });

  state.inflight.set(key, promise);
  return promise;
}

async function runSurf(sql: string, maxRows: number): Promise<SurfRow[]> {
  const state = getSurfState();
  return runWithSurfRateLimitRetry(async () => {
    const release = await gate(state);
    try {
      await reserveStartSlot(state);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), SURF_TIMEOUT_MS);

      const url = `${SURF_API_BASE}/v1/onchain/sql`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (SURF_API_KEY) {
        headers["Authorization"] = `Bearer ${SURF_API_KEY}`;
      }
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ sql, max_rows: maxRows }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        if (res.status === 429) {
          throw new Error(`429 Too Many Requests: ${body.slice(0, 200)}`);
        }
        throw new Error(
          `Surf API ${res.status}: ${body.slice(0, 400)}\nSQL: ${sql.slice(0, 200)}`
        );
      }

      const json = (await res.json()) as {
        data?: SurfRow[];
        error?: { message: string };
      };

      if (json.error) {
        throw new Error(
          `Surf API error: ${json.error.message}\nSQL: ${sql.slice(0, 200)}`
        );
      }

      return Array.isArray(json.data) ? json.data : [];
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error(
          `Surf API timed out after ${SURF_TIMEOUT_MS}ms\nSQL: ${sql.slice(0, 200)}`
        );
      }
      throw err;
    } finally {
      release();
    }
  });
}

/** Convert Surf's Unix epoch seconds to ISO date string (YYYY-MM-DD). */
export function epochToDate(epoch: number | string | null | undefined): string {
  if (epoch === null || epoch === undefined) return "";
  const n = typeof epoch === "string" ? parseInt(epoch, 10) : epoch;
  if (!Number.isFinite(n)) return "";
  return new Date(n * 1000).toISOString().slice(0, 10);
}

/** Convert epoch (sec) to short label like "Apr 14". */
export function epochToShort(epoch: number | string | null | undefined): string {
  if (epoch === null || epoch === undefined) return "";
  const n = typeof epoch === "string" ? parseInt(epoch, 10) : epoch;
  if (!Number.isFinite(n)) return "";
  const d = new Date(n * 1000);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Map a UI range token to days. */
export function rangeToDays(range: string | null | undefined): number {
  switch ((range || "30d").toLowerCase()) {
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
    case "1y": return 365;
    case "all": return 3650;
    default: return 30;
  }
}

export {
  TEMPO_LAUNCH_DATE,
  tempoAgeDays,
  DATA_GAP_START,
  DATA_GAP_END,
  isInDataGap,
} from "./constants";

/** Filter clause excluding dirty UNKNOWN tokens. */
export const NOT_UNKNOWN = `token_symbol NOT IN ('UNKNOWN', '')`;
