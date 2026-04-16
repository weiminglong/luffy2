import { NextRequest } from "next/server";
import { querySurf, epochToDate, rangeToDays } from "@/lib/surf";
import { jsonOK, jsonErr, num, str } from "@/lib/api";

export const runtime = "nodejs";

const CANONICAL = `('USDC.e', 'pathUSD', 'USDS', 'USDT0')`;

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") ?? "all";
  const days = rangeToDays(range);

  try {
    const tsSql = `
      SELECT
        block_date,
        token_symbol,
        txn_count,
        transfer_volume_usd,
        dau,
        cumulative_supply_usd
      FROM agent.tempo_stablecoin_metrics_daily
      WHERE block_date >= today() - ${days}
        AND token_symbol IN ${CANONICAL}
      ORDER BY block_date, token_symbol
    `;

    const latestSql = `
      SELECT
        token_symbol,
        argMax(cumulative_supply_usd, block_date) AS cumulative_supply_usd,
        argMax(dau, block_date)                   AS dau,
        argMax(txn_count, block_date)             AS txn_count,
        argMax(transfer_volume_usd, block_date)   AS transfer_volume_usd
      FROM agent.tempo_stablecoin_metrics_daily
      WHERE block_date >= today() - 30
        AND token_symbol IN ${CANONICAL}
      GROUP BY token_symbol
      ORDER BY cumulative_supply_usd DESC
    `;

    const [tsRows, latestRows] = await Promise.all([
      querySurf(tsSql, { ttl: 1800 }),
      querySurf(latestSql, { ttl: 1800 }),
    ]);

    const timeseries = tsRows.map((r) => ({
      block_date: epochToDate(r.block_date as number | string | null),
      token_symbol: str(r.token_symbol),
      txn_count: num(r.txn_count),
      transfer_volume_usd: num(r.transfer_volume_usd),
      dau: num(r.dau),
      cumulative_supply_usd: num(r.cumulative_supply_usd),
    }));

    const by_token = latestRows.map((r) => ({
      token_symbol: str(r.token_symbol),
      cumulative_supply_usd: num(r.cumulative_supply_usd),
      dau: num(r.dau),
      txn_count: num(r.txn_count),
      transfer_volume_usd: num(r.transfer_volume_usd),
    }));

    const current_total_supply_usd = by_token.reduce(
      (s, r) => s + r.cumulative_supply_usd,
      0
    );

    const freshness = timeseries.length
      ? timeseries[timeseries.length - 1].block_date
      : undefined;

    return jsonOK(
      {
        timeseries,
        by_token,
        current_total_supply_usd,
      },
      range,
      freshness
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return jsonErr(msg);
  }
}
