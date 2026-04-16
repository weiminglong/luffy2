import { NextRequest } from "next/server";
import { querySurf, epochToDate, rangeToDays } from "@/lib/surf";
import { jsonOK, jsonErr, num, str } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") ?? "30d";
  const days = rangeToDays(range);

  try {
    // Daily prices for tracked tokens
    // Columns: block_date, symbol, price, source, contract_address, decimals
    const tsSql = `
      SELECT
        block_date,
        symbol,
        price
      FROM agent.tempo_prices_day
      WHERE block_date >= today() - ${days}
        AND symbol NOT IN ('UNKNOWN', '')
        AND price > 0
      ORDER BY block_date, symbol
    `;

    // Latest prices snapshot
    const latestSql = `
      SELECT
        symbol,
        argMax(price, block_date) AS price
      FROM agent.tempo_prices_day
      WHERE block_date >= today() - 7
        AND symbol NOT IN ('UNKNOWN', '')
        AND price > 0
      GROUP BY symbol
      ORDER BY price DESC
      LIMIT 20
    `;

    const [tsRows, latestRows] = await Promise.all([
      querySurf(tsSql, { ttl: 1800 }),
      querySurf(latestSql, { ttl: 1800 }),
    ]);

    const timeseries = tsRows.map((r) => ({
      block_date: epochToDate(r.block_date as number | string | null),
      token_symbol: str(r.symbol),
      price_usd: num(r.price),
    }));

    const latest = latestRows.map((r) => ({
      token_symbol: str(r.symbol),
      price_usd: num(r.price),
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
