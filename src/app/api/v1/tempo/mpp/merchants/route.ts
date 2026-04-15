import { NextRequest } from "next/server";
import { querySurf, epochToDate, NOT_UNKNOWN, rangeToDays } from "@/lib/surf";
import { jsonOK, jsonErr, num, str } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") ?? "30d";
  const days = rangeToDays(range);

  try {
    const topSql = `
      SELECT
        transfer_to         AS payee,
        SUM(payment_count)  AS payments,
        SUM(volume_usd)     AS volume,
        SUM(unique_payers)  AS payers
      FROM agent.tempo_mpp_payees_daily
      WHERE block_date >= today() - ${days}
        AND ${NOT_UNKNOWN}
      GROUP BY payee
      HAVING payers >= 5
      ORDER BY volume DESC
      LIMIT 20
    `;

    const tsSql = `
      SELECT
        block_date,
        COUNT(DISTINCT transfer_to) AS active_merchants
      FROM agent.tempo_mpp_payees_daily
      WHERE block_date >= today() - ${days}
        AND ${NOT_UNKNOWN}
      GROUP BY block_date
      ORDER BY block_date
    `;

    const [topRows, tsRows] = await Promise.all([
      querySurf(topSql, { ttl: 3600 }),
      querySurf(tsSql, { ttl: 3600 }),
    ]);

    const top_merchants = topRows.map((r) => ({
      payee: str(r.payee),
      payments: num(r.payments),
      volume_usd: num(r.volume),
      unique_payers: num(r.payers),
    }));

    const merchants_timeseries = tsRows.map((r) => ({
      block_date: epochToDate(r.block_date as number | string | null),
      active_merchants: num(r.active_merchants),
    }));

    const freshness = merchants_timeseries.length
      ? merchants_timeseries[merchants_timeseries.length - 1].block_date
      : undefined;
    return jsonOK({ top_merchants, merchants_timeseries }, range, freshness);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return jsonErr(msg);
  }
}
