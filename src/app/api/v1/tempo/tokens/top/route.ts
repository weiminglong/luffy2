import { NextRequest } from "next/server";
import { querySurf, rangeToDays } from "@/lib/surf";
import { jsonOK, jsonErr, num, str } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const rangeParam = (req.nextUrl.searchParams.get("range") ?? "30d").toLowerCase();
  const validRange = ["7d", "30d", "90d", "1y"].includes(rangeParam) ? rangeParam : "30d";
  const sortParam = (req.nextUrl.searchParams.get("sort") ?? "transfers").toLowerCase();
  const orderBy = sortParam === "volume" ? "volume_usd" : "tx_count";
  const days = rangeToDays(validRange);

  try {
    const sql = `
      SELECT
        token_symbol,
        tx_count,
        volume_usd,
        peak_senders,
        peak_receivers,
        volume_usd / tx_count AS avg_transfer_usd
      FROM (
        SELECT
          token_symbol,
          sum(transfer_count)           AS tx_count,
          sum(volume_usd)               AS volume_usd,
          max(unique_senders)           AS peak_senders,
          max(unique_receivers)         AS peak_receivers
        FROM agent.tempo_token_metrics_daily
        WHERE block_date >= today() - ${days}
          AND token_symbol NOT IN ('UNKNOWN', '', 'ENSH', 'TDOGE')
        GROUP BY token_symbol
      )
      WHERE tx_count > 0 AND (volume_usd / tx_count) < 1000000
      ORDER BY ${orderBy} DESC
      LIMIT 15
    `;
    const rows = await querySurf(sql, { ttl: 1800 });

    const tokens = rows.map((r) => ({
      token_symbol: str(r.token_symbol),
      tx_count: num(r.tx_count),
      volume_usd: num(r.volume_usd),
      unique_senders: num(r.peak_senders),
      unique_receivers: num(r.peak_receivers),
      avg_transfer_usd: num(r.avg_transfer_usd),
    }));

    return jsonOK({ tokens, sort: sortParam }, validRange);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return jsonErr(msg);
  }
}
