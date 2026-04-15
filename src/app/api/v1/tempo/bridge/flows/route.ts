import { NextRequest } from "next/server";
import { querySurf, epochToDate, NOT_UNKNOWN, rangeToDays } from "@/lib/surf";
import { jsonOK, jsonErr, num, str } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") ?? "30d";
  const days = rangeToDays(range);

  try {
    // Restrict to canonical stablecoins so a single bridged token (e.g. ENSH
    // initial mint of $100M) doesn't dwarf the chart and mislead viewers.
    const STABLES = `('USDC.e','pathUSD','USDS')`;

    const tsSql = `
      SELECT
        block_date, token_symbol,
        inflow_count, inflow_usd,
        outflow_count, outflow_usd,
        net_flow_usd
      FROM agent.tempo_bridge_flows_daily
      WHERE block_date >= today() - ${days}
        AND ${NOT_UNKNOWN}
        AND token_symbol IN ${STABLES}
      ORDER BY block_date, token_symbol
    `;

    const byTokenSql = `
      SELECT
        token_symbol,
        SUM(inflow_usd)  AS inflow_usd,
        SUM(outflow_usd) AS outflow_usd,
        SUM(net_flow_usd) AS net_flow_usd
      FROM agent.tempo_bridge_flows_daily
      WHERE block_date >= today() - ${days}
        AND ${NOT_UNKNOWN}
        AND token_symbol IN ${STABLES}
      GROUP BY token_symbol
      ORDER BY inflow_usd DESC
    `;

    const [tsRows, byTokenRows] = await Promise.all([
      querySurf(tsSql, { ttl: 3600 }),
      querySurf(byTokenSql, { ttl: 3600 }),
    ]);

    const timeseries = tsRows.map((r) => ({
      block_date: epochToDate(r.block_date as number | string | null),
      token_symbol: str(r.token_symbol),
      inflow_count: num(r.inflow_count),
      inflow_usd: num(r.inflow_usd),
      outflow_count: num(r.outflow_count),
      outflow_usd: num(r.outflow_usd),
      net_flow_usd: num(r.net_flow_usd),
    }));

    const by_token = byTokenRows.map((r) => ({
      token_symbol: str(r.token_symbol),
      inflow_usd: num(r.inflow_usd),
      outflow_usd: num(r.outflow_usd),
      net_flow_usd: num(r.net_flow_usd),
    }));

    const total_inflow_usd = by_token.reduce((s, r) => s + r.inflow_usd, 0);
    const total_outflow_usd = by_token.reduce((s, r) => s + r.outflow_usd, 0);
    const net_flow_usd = total_inflow_usd - total_outflow_usd;

    const freshness = timeseries.length ? timeseries[timeseries.length - 1].block_date : undefined;
    return jsonOK(
      {
        timeseries,
        by_token,
        total_inflow_usd,
        total_outflow_usd,
        net_flow_usd,
      },
      range,
      freshness
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return jsonErr(msg);
  }
}
