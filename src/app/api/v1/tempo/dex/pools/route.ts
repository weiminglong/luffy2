import { NextRequest } from "next/server";
import { querySurf } from "@/lib/surf";
import { jsonOK, jsonErr, num, str } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  try {
    const sql = `
      SELECT
        pair_address,
        argMax(token0_symbol, block_date)     AS token0_symbol,
        argMax(token1_symbol, block_date)     AS token1_symbol,
        argMax(token0_balance, block_date)    AS token0_balance,
        argMax(token1_balance, block_date)    AS token1_balance,
        argMax(token0_usd, block_date)        AS token0_usd,
        argMax(token1_usd, block_date)        AS token1_usd,
        argMax(tvl_usd, block_date)           AS tvl_usd,
        argMax(project, block_date)           AS project
      FROM agent.tempo_uniswap_v2_tvl
      WHERE block_date >= today() - 7
      GROUP BY pair_address
      ORDER BY tvl_usd DESC
      LIMIT 15
    `;
    const rows = await querySurf(sql, { ttl: 1800 });

    const pools = rows.map((r) => ({
      pair_address: str(r.pair_address),
      token0_symbol: str(r.token0_symbol),
      token1_symbol: str(r.token1_symbol),
      token0_balance: num(r.token0_balance),
      token1_balance: num(r.token1_balance),
      token0_usd: num(r.token0_usd),
      token1_usd: num(r.token1_usd),
      tvl_usd: num(r.tvl_usd),
      project: str(r.project),
    }));

    return jsonOK({ pools }, "7d");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return jsonErr(msg);
  }
}
