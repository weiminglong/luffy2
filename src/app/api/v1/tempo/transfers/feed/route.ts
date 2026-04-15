import { NextRequest } from "next/server";
import { querySurf, epochToDate } from "@/lib/surf";
import { jsonOK, jsonErr, num, str } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") ?? "30d";

  try {
    const sql = `
      SELECT
        block_date,
        transaction_hash,
        transfer_from,
        transfer_to,
        token_symbol,
        amount_usd
      FROM agent.tempo_transfers
      WHERE block_date >= today() - 1
      ORDER BY block_date DESC, log_index DESC
      LIMIT 50
    `;
    const rows = await querySurf(sql, { ttl: 0 });

    const transfers = rows.map((r) => ({
      block_date: epochToDate(r.block_date as number | string | null),
      transaction_hash: str(r.transaction_hash),
      transfer_from: str(r.transfer_from),
      transfer_to: str(r.transfer_to),
      token_symbol: str(r.token_symbol),
      amount_usd: num(r.amount_usd),
    }));

    const freshness = transfers.length ? transfers[0].block_date : undefined;
    return jsonOK({ transfers }, range, freshness);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return jsonErr(msg);
  }
}
