/**
 * Surf onchain-sql wrapper.
 *
 * Shells out to the `surf` CLI from server-side API routes.
 * Surf returns rows with date columns as Unix epoch seconds — callers should
 * convert via `epochToDate()` when needed.
 */
import { spawn } from "node:child_process";
import { writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SURF_BIN = process.env.SURF_BIN || "surf";
const MAX_CONCURRENT = Number(process.env.SURF_MAX_CONCURRENT || 3);
const SURF_TIMEOUT_MS = Number(process.env.SURF_TIMEOUT_MS || 60_000);

export type SurfRow = Record<string, string | number | boolean | null>;

interface CacheEntry {
  expiresAt: number;
  data: SurfRow[];
}

const cache = new Map<string, CacheEntry>();

/**
 * In-flight dedupe: if the same SQL is requested while a previous request
 * is still running, return the same promise. Prevents thundering-herd on
 * cold dev-server starts.
 */
const inflight = new Map<string, Promise<SurfRow[]>>();

/** Simple FIFO concurrency limiter. Surf CLI throttles aggressively. */
let active = 0;
const waiters: Array<() => void> = [];
async function gate(): Promise<() => void> {
  if (active >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  active++;
  return () => {
    active--;
    const next = waiters.shift();
    if (next) next();
  };
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

  if (ttl > 0) {
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
  }

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = runSurf(sql, maxRows).then((data) => {
    if (ttl > 0) cache.set(key, { expiresAt: Date.now() + ttl * 1000, data });
    inflight.delete(key);
    return data;
  }).catch((err) => {
    inflight.delete(key);
    throw err;
  });

  inflight.set(key, promise);
  return promise;
}

async function runSurf(sql: string, maxRows: number): Promise<SurfRow[]> {
  const release = await gate();
  try {
    const dir = await mkdtemp(join(tmpdir(), "tempo-dash-"));
    const file = join(dir, "q.json");
    await writeFile(file, JSON.stringify({ sql, max_rows: maxRows }));

    const stdout = await new Promise<string>((resolve, reject) => {
      const proc = spawn(
        SURF_BIN,
        ["onchain-sql", `@${file}`, "-o", "json", "-f", "body.data"],
        {
          // Critical: ignore stdin or surf hangs forever waiting for input.
          stdio: ["ignore", "pipe", "pipe"],
          env: process.env,
        }
      );
      let out = "";
      let err = "";
      proc.stdout.on("data", (c: Buffer) => (out += c.toString("utf-8")));
      proc.stderr.on("data", (c: Buffer) => (err += c.toString("utf-8")));
      const timer = setTimeout(() => {
        proc.kill("SIGTERM");
        reject(new Error(`surf timed out after ${SURF_TIMEOUT_MS}ms\nSQL: ${sql.slice(0, 200)}`));
      }, SURF_TIMEOUT_MS);
      proc.on("error", (e) => {
        clearTimeout(timer);
        reject(new Error(`surf spawn error: ${e.message}`));
      });
      proc.on("close", (code, signal) => {
        clearTimeout(timer);
        if (code !== 0) {
          const detail = (err || out || "no stderr").slice(0, 600);
          reject(
            new Error(
              `surf onchain-sql failed [exit=${code} signal=${signal}]: ${detail}\nSQL: ${sql.slice(0, 200)}`
            )
          );
          return;
        }
        resolve(out);
      });
    });

    let data: SurfRow[] = [];
    try {
      data = JSON.parse(stdout) as SurfRow[];
    } catch {
      throw new Error(
        `surf returned non-JSON: ${stdout.slice(0, 300)}\nSQL: ${sql.slice(0, 200)}`
      );
    }
    if (!Array.isArray(data)) data = [];
    return data;
  } finally {
    release();
  }
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

export const TEMPO_LIVE_DAYS = 30; // cap for "all" since launch ~Mar 25 2026

/** Filter clause excluding dirty UNKNOWN tokens. */
export const NOT_UNKNOWN = `token_symbol NOT IN ('UNKNOWN', '')`;
