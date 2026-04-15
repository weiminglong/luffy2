import { NextRequest } from "next/server";
import { querySurf, epochToDate, NOT_UNKNOWN, rangeToDays } from "@/lib/surf";
import { jsonOK, jsonErr, num } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") ?? "30d";
  const days = rangeToDays(range);

  try {
    const chainSql = `
      SELECT
        argMax(wau, block_date) AS wau,
        argMax(mau, block_date) AS mau,
        argMax(new_users, block_date) AS new_users,
        argMax(sponsored_fee_pct, block_date) AS sponsored_fee_pct,
        max(block_date) AS latest_date
      FROM agent.tempo_chain_daily
      WHERE block_date >= today() - ${days}
    `;

    const mppVolSql = `
      SELECT SUM(volume_usd) AS mpp_volume_24h, max(block_date) AS d
      FROM agent.tempo_mpp_metrics_daily
      WHERE block_date = (
        SELECT max(block_date) FROM agent.tempo_mpp_metrics_daily WHERE ${NOT_UNKNOWN}
      )
      AND ${NOT_UNKNOWN}
    `;

    const merchantsSql = `
      SELECT COUNT(DISTINCT transfer_to) AS active_merchants, max(block_date) AS d
      FROM agent.tempo_mpp_payees_daily
      WHERE block_date = (
        SELECT max(block_date) FROM agent.tempo_mpp_payees_daily WHERE ${NOT_UNKNOWN}
      )
      AND ${NOT_UNKNOWN}
    `;

    const [chainRows, mppRows, merchRows] = await Promise.all([
      querySurf(chainSql, { ttl: 300 }),
      querySurf(mppVolSql, { ttl: 300 }),
      querySurf(merchantsSql, { ttl: 300 }),
    ]);

    const c = chainRows[0] ?? {};
    const m = mppRows[0] ?? {};
    const p = merchRows[0] ?? {};

    const data = {
      wau: num(c.wau),
      mau: num(c.mau),
      new_users: num(c.new_users),
      sponsored_fee_pct: num(c.sponsored_fee_pct),
      mpp_volume_24h: num(m.mpp_volume_24h),
      active_merchants: num(p.active_merchants),
      latest_date: epochToDate(c.latest_date as number | string | null),
    };

    return jsonOK(data, range, data.latest_date || undefined);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return jsonErr(msg);
  }
}
