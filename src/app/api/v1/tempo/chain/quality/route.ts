import { NextRequest } from "next/server";
import { querySurf, epochToDate, rangeToDays } from "@/lib/surf";
import { jsonOK, jsonErr, num } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") ?? "30d";
  const days = rangeToDays(range);

  try {
    const sqlChain = `
      SELECT
        block_date,
        total_transactions,
        user_transactions,
        system_transactions,
        unique_senders,
        contract_deployments
      FROM agent.tempo_daily_chain_stats
      WHERE block_date >= today() - ${days}
      ORDER BY block_date
    `;
    const sqlFees = `
      SELECT
        block_date,
        avg_fee_usd,
        median_fee_usd,
        p95_fee_usd,
        total_fees_usd,
        sponsored_pct,
        unique_fee_payers,
        unique_sponsors
      FROM agent.tempo_fee_metrics_daily
      WHERE block_date >= today() - ${days}
      ORDER BY block_date
    `;

    const [chainRows, feeRows] = await Promise.all([
      querySurf(sqlChain, { ttl: 1800 }),
      querySurf(sqlFees, { ttl: 1800 }),
    ]);

    const merged = new Map<
      string,
      {
        block_date: string;
        total_transactions: number;
        user_transactions: number;
        system_transactions: number;
        user_tx_pct: number;
        contract_deployments: number;
        avg_fee_usd: number;
        median_fee_usd: number;
        p95_fee_usd: number;
        total_fees_usd: number;
        sponsored_pct: number;
        unique_fee_payers: number;
      }
    >();

    for (const r of chainRows) {
      const date = epochToDate(r.block_date as number | string | null);
      const total = num(r.total_transactions);
      const user = num(r.user_transactions);
      merged.set(date, {
        block_date: date,
        total_transactions: total,
        user_transactions: user,
        system_transactions: num(r.system_transactions),
        user_tx_pct: total > 0 ? (user / total) * 100 : 0,
        contract_deployments: num(r.contract_deployments),
        avg_fee_usd: 0,
        median_fee_usd: 0,
        p95_fee_usd: 0,
        total_fees_usd: 0,
        sponsored_pct: 0,
        unique_fee_payers: 0,
      });
    }

    for (const r of feeRows) {
      const date = epochToDate(r.block_date as number | string | null);
      const existing = merged.get(date) ?? {
        block_date: date,
        total_transactions: 0,
        user_transactions: 0,
        system_transactions: 0,
        user_tx_pct: 0,
        contract_deployments: 0,
        avg_fee_usd: 0,
        median_fee_usd: 0,
        p95_fee_usd: 0,
        total_fees_usd: 0,
        sponsored_pct: 0,
        unique_fee_payers: 0,
      };
      existing.avg_fee_usd = num(r.avg_fee_usd);
      existing.median_fee_usd = num(r.median_fee_usd);
      existing.p95_fee_usd = num(r.p95_fee_usd);
      existing.total_fees_usd = num(r.total_fees_usd);
      existing.sponsored_pct = num(r.sponsored_pct);
      existing.unique_fee_payers = num(r.unique_fee_payers);
      merged.set(date, existing);
    }

    const timeseries = Array.from(merged.values()).sort((a, b) =>
      a.block_date.localeCompare(b.block_date)
    );
    const freshness = timeseries.length
      ? timeseries[timeseries.length - 1].block_date
      : undefined;

    return jsonOK({ timeseries }, range, freshness);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return jsonErr(msg);
  }
}
