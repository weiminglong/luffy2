import { NextRequest } from "next/server";
import { querySurf, epochToDate, NOT_UNKNOWN, rangeToDays } from "@/lib/surf";
import { jsonOK, jsonErr, num, str } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") ?? "30d";
  const days = rangeToDays(range);

  try {
    const tsSql = `
      SELECT
        block_date,
        token_symbol,
        mint_volume_usd,
        burn_volume_usd,
        net_supply_change_usd
      FROM agent.tempo_stablecoin_supply
      WHERE block_date >= today() - ${days}
        AND ${NOT_UNKNOWN}
      ORDER BY block_date, token_symbol
    `;

    const byTokenSql = `
      SELECT
        token_symbol,
        SUM(net_supply_change_usd) AS cumulative_supply_usd,
        SUM(mint_volume_usd)       AS mint_total,
        SUM(burn_volume_usd)       AS burn_total
      FROM agent.tempo_stablecoin_supply
      WHERE ${NOT_UNKNOWN}
      GROUP BY token_symbol
      ORDER BY cumulative_supply_usd DESC
    `;

    const [tsRows, byTokenRows] = await Promise.all([
      querySurf(tsSql, { ttl: 3600 }),
      querySurf(byTokenSql, { ttl: 3600 }),
    ]);

    const timeseries = tsRows.map((r) => ({
      block_date: epochToDate(r.block_date as number | string | null),
      token_symbol: str(r.token_symbol),
      mint_volume_usd: num(r.mint_volume_usd),
      burn_volume_usd: num(r.burn_volume_usd),
      net_supply_change_usd: num(r.net_supply_change_usd),
    }));

    const by_token = byTokenRows.map((r) => ({
      token_symbol: str(r.token_symbol),
      cumulative_supply_usd: num(r.cumulative_supply_usd),
      mint_total: num(r.mint_total),
      burn_total: num(r.burn_total),
    }));

    const latest_total_supply_usd = by_token.reduce(
      (s, r) => s + r.cumulative_supply_usd,
      0
    );

    const freshness = timeseries.length ? timeseries[timeseries.length - 1].block_date : undefined;
    return jsonOK(
      { timeseries, by_token, latest_total_supply_usd },
      range,
      freshness
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return jsonErr(msg);
  }
}
