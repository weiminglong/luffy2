import { NextRequest } from "next/server";
import { querySurf, epochToDate, rangeToDays } from "@/lib/surf";
import { jsonOK, jsonErr, num } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") ?? "30d";
  const days = rangeToDays(range);

  try {
    const sql = `
      SELECT
        block_date,
        dau, wau, mau,
        new_users, returning_users,
        total_txs, total_transfers,
        total_fees_usd, sponsored_fee_pct,
        dex_volume_usd,
        batched_tx_count,
        contract_deployments_from_traces
      FROM agent.tempo_chain_daily
      WHERE block_date >= today() - ${days}
      ORDER BY block_date
    `;
    const rows = await querySurf(sql, { ttl: 3600 });
    const timeseries = rows.map((r) => ({
      block_date: epochToDate(r.block_date as number | string | null),
      dau: num(r.dau),
      wau: num(r.wau),
      mau: num(r.mau),
      new_users: num(r.new_users),
      returning_users: num(r.returning_users),
      total_txs: num(r.total_txs),
      total_transfers: num(r.total_transfers),
      total_fees_usd: num(r.total_fees_usd),
      sponsored_fee_pct: num(r.sponsored_fee_pct),
      dex_volume_usd: num(r.dex_volume_usd),
      batched_tx_count: num(r.batched_tx_count),
      contract_deployments_from_traces: num(r.contract_deployments_from_traces),
    }));
    const freshness = timeseries.length ? timeseries[timeseries.length - 1].block_date : undefined;
    return jsonOK({ timeseries }, range, freshness);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return jsonErr(msg);
  }
}
