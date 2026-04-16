import { NextRequest } from "next/server";
import { querySurf, epochToDate, rangeToDays } from "@/lib/surf";
import { jsonOK, jsonErr, num, str } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") ?? "all";
  const days = rangeToDays(range);

  try {
    const tsSql = `
      SELECT block_date, project, pools, tvl_usd
      FROM agent.tempo_tvl_daily
      WHERE block_date >= today() - ${days}
      ORDER BY block_date, project
    `;
    const latestSql = `
      SELECT project, argMax(tvl_usd, block_date) AS tvl_usd, argMax(pools, block_date) AS pools
      FROM agent.tempo_tvl_daily
      WHERE block_date >= today() - 30
        AND block_date <= today() - 1
      GROUP BY project
      ORDER BY tvl_usd DESC
    `;
    const priorSql = `
      SELECT sum(tvl_usd) AS total_tvl
      FROM (
        SELECT project, argMax(tvl_usd, block_date) AS tvl_usd
        FROM agent.tempo_tvl_daily
        WHERE block_date >= today() - 15 AND block_date <= today() - 8
        GROUP BY project
      )
    `;

    const [tsRows, latestRows, priorRows] = await Promise.all([
      querySurf(tsSql, { ttl: 1800 }),
      querySurf(latestSql, { ttl: 1800 }),
      querySurf(priorSql, { ttl: 1800 }),
    ]);

    const timeseries = tsRows.map((r) => ({
      block_date: epochToDate(r.block_date as number | string | null),
      project: str(r.project),
      pools: num(r.pools),
      tvl_usd: num(r.tvl_usd),
    }));

    const by_project = latestRows.map((r) => ({
      project: str(r.project),
      tvl_usd: num(r.tvl_usd),
      pools: num(r.pools),
    }));

    const current_total_usd = by_project.reduce((s, p) => s + p.tvl_usd, 0);
    const prior_7d_total_usd = num(priorRows[0]?.total_tvl);

    const freshness = timeseries.length
      ? timeseries[timeseries.length - 1].block_date
      : undefined;

    return jsonOK(
      {
        current_total_usd,
        prior_7d_total_usd,
        by_project,
        timeseries,
      },
      range,
      freshness
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return jsonErr(msg);
  }
}
