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
        block_date, token_symbol,
        payment_count, volume_usd,
        avg_payment_usd, median_payment_usd,
        unique_payers, unique_payees
      FROM agent.tempo_mpp_metrics_daily
      WHERE block_date >= today() - ${days}
        AND ${NOT_UNKNOWN}
      ORDER BY block_date, token_symbol
    `;

    const byTokenSql = `
      SELECT
        token_symbol,
        SUM(payment_count)  AS payment_count,
        SUM(volume_usd)     AS volume_usd,
        SUM(unique_payers)  AS unique_payers
      FROM agent.tempo_mpp_metrics_daily
      WHERE block_date >= today() - ${days}
        AND ${NOT_UNKNOWN}
      GROUP BY token_symbol
      ORDER BY volume_usd DESC
    `;

    const [tsRows, byTokenRows] = await Promise.all([
      querySurf(tsSql, { ttl: 3600 }),
      querySurf(byTokenSql, { ttl: 3600 }),
    ]);

    const timeseries = tsRows.map((r) => ({
      block_date: epochToDate(r.block_date as number | string | null),
      token_symbol: str(r.token_symbol),
      payment_count: num(r.payment_count),
      volume_usd: num(r.volume_usd),
      avg_payment_usd: num(r.avg_payment_usd),
      median_payment_usd: num(r.median_payment_usd),
      unique_payers: num(r.unique_payers),
      unique_payees: num(r.unique_payees),
    }));

    const by_token = byTokenRows.map((r) => ({
      token_symbol: str(r.token_symbol),
      payment_count: num(r.payment_count),
      volume_usd: num(r.volume_usd),
      unique_payers: num(r.unique_payers),
    }));

    const freshness = timeseries.length ? timeseries[timeseries.length - 1].block_date : undefined;
    return jsonOK({ timeseries, by_token }, range, freshness);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return jsonErr(msg);
  }
}
