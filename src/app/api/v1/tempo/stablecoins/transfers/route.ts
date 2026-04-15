import { NextRequest } from "next/server";
import { querySurf, epochToDate, rangeToDays } from "@/lib/surf";
import { jsonOK, jsonErr, num, str } from "@/lib/api";

export const runtime = "nodejs";

const STABLECOIN_FILTER = `token_symbol IN ('USDC.e', 'pathUSD', 'USDS')`;

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") ?? "30d";
  const days = rangeToDays(range);

  try {
    const tsSql = `
      SELECT
        block_date,
        COUNT(*)                       AS tx_count,
        COUNT(DISTINCT transfer_from)  AS unique_senders,
        SUM(amount_usd)                AS volume_usd
      FROM agent.tempo_transfers
      WHERE block_date >= today() - ${days}
        AND ${STABLECOIN_FILTER}
      GROUP BY block_date
      ORDER BY block_date
    `;

    const topSendersSql = `
      SELECT transfer_from AS addr, COUNT(*) AS n, SUM(amount_usd) AS vol
      FROM agent.tempo_transfers
      WHERE block_date >= today() - 7
        AND ${STABLECOIN_FILTER}
      GROUP BY transfer_from
      ORDER BY vol DESC
      LIMIT 10
    `;

    const topReceiversSql = `
      SELECT transfer_to AS addr, COUNT(*) AS n, SUM(amount_usd) AS vol
      FROM agent.tempo_transfers
      WHERE block_date >= today() - 7
        AND ${STABLECOIN_FILTER}
      GROUP BY transfer_to
      ORDER BY vol DESC
      LIMIT 10
    `;

    const [tsRows, senderRows, receiverRows] = await Promise.all([
      querySurf(tsSql, { ttl: 1800 }),
      querySurf(topSendersSql, { ttl: 1800 }),
      querySurf(topReceiversSql, { ttl: 1800 }),
    ]);

    const timeseries = tsRows.map((r) => ({
      block_date: epochToDate(r.block_date as number | string | null),
      tx_count: num(r.tx_count),
      unique_senders: num(r.unique_senders),
      volume_usd: num(r.volume_usd),
    }));

    const top_senders = senderRows.map((r) => ({
      address: str(r.addr),
      tx_count: num(r.n),
      volume_usd: num(r.vol),
    }));

    const top_receivers = receiverRows.map((r) => ({
      address: str(r.addr),
      tx_count: num(r.n),
      volume_usd: num(r.vol),
    }));

    const freshness = timeseries.length ? timeseries[timeseries.length - 1].block_date : undefined;
    return jsonOK({ timeseries, top_senders, top_receivers }, range, freshness);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return jsonErr(msg);
  }
}
