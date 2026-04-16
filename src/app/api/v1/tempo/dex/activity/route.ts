import { NextRequest } from "next/server";
import { querySurf, epochToDate, rangeToDays } from "@/lib/surf";
import { jsonOK, jsonErr, num, str } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") ?? "30d";
  const days = rangeToDays(range);

  try {
    // Use tempo_dex_trades_daily for broader DEX coverage (pre-aggregated
    // across all tracked DEX protocols, not just tempo_dex_swaps).
    const tsSql = `
      SELECT
        block_date,
        SUM(trade_count)            AS swaps,
        SUM(unique_traders)         AS traders,
        SUM(volume_usd)             AS volume
      FROM agent.tempo_dex_trades_daily
      WHERE block_date >= today() - ${days}
      GROUP BY block_date
      ORDER BY block_date
    `;

    // Top pairs still from dex_swaps for pair-level detail
    const topPairsSql = `
      SELECT
        concat(token_in_symbol, '/', token_out_symbol) AS pair,
        COUNT(*)                                       AS n,
        SUM(amount_in_usd)                             AS vol
      FROM agent.tempo_dex_swaps
      WHERE block_date >= today() - 7
        AND token_in_symbol  NOT IN ('UNKNOWN', '')
        AND token_out_symbol NOT IN ('UNKNOWN', '')
      GROUP BY pair
      ORDER BY n DESC
      LIMIT 10
    `;

    const [tsRows, pairRows] = await Promise.all([
      querySurf(tsSql, { ttl: 1800 }),
      querySurf(topPairsSql, { ttl: 1800 }),
    ]);

    const timeseries = tsRows.map((r) => ({
      block_date: epochToDate(r.block_date as number | string | null),
      swaps: num(r.swaps),
      traders: num(r.traders),
      volume: num(r.volume),
    }));

    const top_pairs = pairRows.map((r) => ({
      pair: str(r.pair),
      tx_count: num(r.n),
      volume_usd: num(r.vol),
    }));

    const freshness = timeseries.length ? timeseries[timeseries.length - 1].block_date : undefined;
    return jsonOK({ timeseries, top_pairs }, range, freshness);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return jsonErr(msg);
  }
}
