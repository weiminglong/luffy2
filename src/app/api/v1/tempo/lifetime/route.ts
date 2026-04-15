import { NextRequest } from "next/server";
import { querySurf } from "@/lib/surf";
import { jsonOK, jsonErr, num } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  try {
    const chainSql = `
      SELECT
        sum(new_users)                                  AS cumulative_users,
        sum(total_txs)                                  AS cumulative_user_txs,
        sum(total_fees_usd)                             AS cumulative_fees_usd,
        sum(contract_deployments_from_traces)           AS cumulative_deployments,
        sumIf(total_txs, block_date >= today() - 7)     AS txs_last_7d,
        sumIf(total_fees_usd, block_date >= today() - 7) AS fees_last_7d
      FROM agent.tempo_chain_daily
    `;
    const statsSql = `
      SELECT
        sum(total_transactions) AS cumulative_total_txs,
        sumIf(total_transactions, block_date >= today() - 7) AS total_txs_last_7d
      FROM agent.tempo_daily_chain_stats
      WHERE block_date >= today() - 365
    `;
    const [chainRows, statsRows] = await Promise.all([
      querySurf(chainSql, { ttl: 300 }),
      querySurf(statsSql, { ttl: 300 }),
    ]);
    const r = chainRows[0] ?? {};
    const s = statsRows[0] ?? {};

    const userTxs7d = num(r.txs_last_7d);
    const totalTxs7d = num(s.total_txs_last_7d);
    const fees7d = num(r.fees_last_7d);
    const SECONDS_7D = 7 * 86400;

    return jsonOK({
      cumulative_users: num(r.cumulative_users),
      cumulative_total_txs: num(s.cumulative_total_txs),
      cumulative_user_txs: num(r.cumulative_user_txs),
      cumulative_fees_usd: num(r.cumulative_fees_usd),
      cumulative_deployments: num(r.cumulative_deployments),
      avg_tps_7d: totalTxs7d / SECONDS_7D,
      avg_user_tps_7d: userTxs7d / SECONDS_7D,
      avg_fees_per_sec_7d: fees7d / SECONDS_7D,
    }, "all");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return jsonErr(msg);
  }
}
