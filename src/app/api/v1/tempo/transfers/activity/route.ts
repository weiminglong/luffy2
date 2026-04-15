import { NextRequest } from "next/server";
import { querySurf, epochToDate, rangeToDays } from "@/lib/surf";
import { jsonOK, jsonErr, num, str } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") ?? "30d";
  const days = rangeToDays(range);

  try {
    const tsSql = `
      SELECT
        block_date,
        COUNT(*)                        AS tx_count,
        SUM(amount_usd)                 AS volume_usd,
        COUNT(DISTINCT transfer_from)   AS unique_senders,
        COUNT(DISTINCT transfer_to)     AS unique_receivers
      FROM agent.tempo_transfers
      WHERE block_date >= today() - ${days}
      GROUP BY block_date
      ORDER BY block_date
    `;

    const topTokensSql = `
      SELECT
        token_symbol,
        COUNT(*)          AS tx_count,
        SUM(amount_usd)   AS volume
      FROM agent.tempo_transfers
      WHERE block_date >= today() - ${days}
        AND token_symbol NOT IN ('UNKNOWN', '')
      GROUP BY token_symbol
      ORDER BY tx_count DESC
      LIMIT 10
    `;

    const [tsRows, topRows] = await Promise.all([
      querySurf(tsSql, { ttl: 1800 }),
      querySurf(topTokensSql, { ttl: 1800 }),
    ]);

    const timeseries = tsRows.map((r) => ({
      block_date: epochToDate(r.block_date as number | string | null),
      tx_count: num(r.tx_count),
      volume_usd: num(r.volume_usd),
      unique_senders: num(r.unique_senders),
      unique_receivers: num(r.unique_receivers),
    }));

    const top_tokens = topRows.map((r) => ({
      token_symbol: str(r.token_symbol),
      tx_count: num(r.tx_count),
      volume_usd: num(r.volume),
    }));

    const freshness = timeseries.length ? timeseries[timeseries.length - 1].block_date : undefined;
    return jsonOK({ timeseries, top_tokens }, range, freshness);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return jsonErr(msg);
  }
}
