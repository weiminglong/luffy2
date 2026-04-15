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
        user_address,
        token_in_symbol,
        amount_in_usd,
        token_out_symbol,
        amount_out_usd
      FROM agent.tempo_dex_swaps
      WHERE block_date >= today() - 2
      ORDER BY block_date DESC, transaction_index DESC
      LIMIT 50
    `;
    const rows = await querySurf(sql, { ttl: 0 });

    const swaps = rows.map((r) => ({
      block_date: epochToDate(r.block_date as number | string | null),
      transaction_hash: str(r.transaction_hash),
      user_address: str(r.user_address),
      token_in_symbol: str(r.token_in_symbol),
      amount_in_usd: num(r.amount_in_usd),
      token_out_symbol: str(r.token_out_symbol),
      amount_out_usd: num(r.amount_out_usd),
    }));

    const freshness = swaps.length ? swaps[0].block_date : undefined;
    return jsonOK({ swaps }, range, freshness);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return jsonErr(msg);
  }
}
