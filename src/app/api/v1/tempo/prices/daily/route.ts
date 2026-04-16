import { NextRequest } from "next/server";
import { querySurf, epochToDate, rangeToDays } from "@/lib/surf";
import { jsonOK, jsonErr, num, str } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") ?? "30d";
  const days = rangeToDays(range);

  try {
    // Daily prices for tracked tokens
    const tsSql = `
      SELECT
        block_date,
        token_symbol,
        price_usd,
        volume_usd
      FROM agent.tempo_prices_day
      WHERE block_date >= today() - ${days}
        AND token_symbol NOT IN ('UNKNOWN', '')
        AND price_usd > 0
      ORDER BY block_date, token_symbol
    `;

    // Latest prices snapshot
    const latestSql = `
      SELECT
        token_symbol,
        argMax(price_usd, block_date) AS price_usd,
        argMax(volume_usd, block_date) AS volume_usd
      FROM agent.tempo_prices_day
      WHERE block_date >= today() - 7
        AND token_symbol NOT IN ('UNKNOWN', '')
        AND price_usd > 0
      GROUP BY token_symbol
      ORDER BY volume_usd DESC
      LIMIT 20
    `;

    const [tsRows, latestRows] = await Promise.all([
      querySurf(tsSql, { ttl: 1800 }),
      querySurf(latestSql, { ttl: 1800 }),
    ]);

    const timeseries = tsRows.map((r) => ({
      block_date: epochToDate(r.block_date as number | string | null),
      token_symbol: str(r.token_symbol),
      price_usd: num(r.price_usd),
      volume_usd: num(r.volume_usd),
    }));

    const latest = latestRows.map((r) => ({
      token_symbol: str(r.token_symbol),
      price_usd: num(r.price_usd),
      volume_usd: num(r.volume_usd),
    }));

    const freshness = timeseries.length
      ? timeseries[timeseries.length - 1].block_date
      : undefined;

    return jsonOK({ timeseries, latest }, range, freshness);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return jsonErr(msg);
  }
}
