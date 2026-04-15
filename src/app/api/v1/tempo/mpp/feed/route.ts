import { NextRequest } from "next/server";
import { querySurf, epochToDate } from "@/lib/surf";
import { jsonOK, jsonErr, num, str } from "@/lib/api";

export const runtime = "nodejs";

/** Decode a hex string (optionally 0x-prefixed) to UTF-8, falling back to raw. */
function decodeMemo(memoHex: string): string {
  if (!memoHex) return "";
  try {
    const clean = memoHex.startsWith("0x") ? memoHex.slice(2) : memoHex;
    if (clean.length === 0 || clean.length % 2 !== 0) return memoHex;
    const buf = Buffer.from(clean, "hex");
    const decoded = buf.toString("utf-8");
    // Strip null bytes and return if printable.
    const trimmed = decoded.replace(/\u0000+$/g, "");
    // If the decoded string is mostly non-printable, fall back.
    // Count printable chars.
    const printable = trimmed.replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, "").length;
    if (trimmed.length > 0 && printable / trimmed.length > 0.5) return trimmed;
    return memoHex;
  } catch {
    return memoHex;
  }
}

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
        amount_usd,
        memo_hex
      FROM agent.tempo_transfer_with_memo_events
      WHERE block_date >= today() - 3
      ORDER BY block_date DESC, log_index DESC
      LIMIT 50
    `;
    const rows = await querySurf(sql, { ttl: 300 });

    const payments = rows.map((r) => {
      const memoHex = str(r.memo_hex);
      return {
        block_date: epochToDate(r.block_date as number | string | null),
        transaction_hash: str(r.transaction_hash),
        transfer_from: str(r.transfer_from),
        transfer_to: str(r.transfer_to),
        token_symbol: str(r.token_symbol),
        amount_usd: num(r.amount_usd),
        memo_hex: memoHex,
        memo: decodeMemo(memoHex),
      };
    });

    const freshness = payments.length ? payments[0].block_date : undefined;
    return jsonOK({ payments }, range, freshness);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return jsonErr(msg);
  }
}
