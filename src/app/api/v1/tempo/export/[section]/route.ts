import { NextRequest, NextResponse } from "next/server";
import { querySurf, epochToDate, NOT_UNKNOWN, rangeToDays, SurfRow } from "@/lib/surf";
import { jsonErr } from "@/lib/api";

export const runtime = "nodejs";

type Section =
  | "overview"
  | "chain"
  | "stablecoins"
  | "dex"
  | "mpp"
  | "transfers"
  | "benchmark";

const VALID_SECTIONS: readonly Section[] = [
  "overview",
  "chain",
  "stablecoins",
  "dex",
  "mpp",
  "transfers",
  "benchmark",
] as const;

/** Escape a single CSV field (wrap in quotes if it contains special chars). */
function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => csvEscape(r[h])).join(","));
  }
  return lines.join("\n");
}

/** Convert any row with a `block_date` epoch into ISO date string. */
function normalizeRows(rows: SurfRow[]): Record<string, unknown>[] {
  return rows.map((r) => {
    const out: Record<string, unknown> = { ...r };
    if ("block_date" in out) {
      out.block_date = epochToDate(out.block_date as number | string | null);
    }
    return out;
  });
}

async function fetchSection(section: Section, days: number): Promise<SurfRow[]> {
  switch (section) {
    case "overview":
    case "chain":
      return querySurf(
        `SELECT block_date, dau, wau, mau, new_users, returning_users,
                total_txs, total_transfers, total_fees_usd,
                sponsored_fee_pct, dex_volume_usd,
                batched_tx_count, contract_deployments_from_traces
         FROM agent.tempo_chain_daily
         WHERE block_date >= today() - ${days}
         ORDER BY block_date`,
        { ttl: 0 }
      );

    case "stablecoins":
      return querySurf(
        `SELECT block_date, token_symbol,
                mint_volume_usd, burn_volume_usd, net_supply_change_usd
         FROM agent.tempo_stablecoin_supply
         WHERE block_date >= today() - ${days}
           AND ${NOT_UNKNOWN}
         ORDER BY block_date, token_symbol`,
        { ttl: 0 }
      );

    case "dex":
      // Cap raw swaps at 10k for export sanity.
      return querySurf(
        `SELECT block_date, transaction_hash, user_address,
                token_in_symbol, amount_in_usd,
                token_out_symbol, amount_out_usd
         FROM agent.tempo_dex_swaps
         WHERE block_date >= today() - ${days}
         ORDER BY block_date DESC, transaction_index DESC
         LIMIT 10000`,
        { ttl: 0, maxRows: 10000 }
      );

    case "mpp":
      return querySurf(
        `SELECT block_date, token_symbol,
                payment_count, volume_usd,
                avg_payment_usd, median_payment_usd,
                unique_payers, unique_payees
         FROM agent.tempo_mpp_metrics_daily
         WHERE block_date >= today() - ${days}
           AND ${NOT_UNKNOWN}
         ORDER BY block_date, token_symbol`,
        { ttl: 0 }
      );

    case "transfers":
      return querySurf(
        `SELECT block_date, transaction_hash, transfer_from, transfer_to,
                token_symbol, amount_usd
         FROM agent.tempo_transfers
         WHERE block_date >= today() - ${days}
         ORDER BY block_date DESC, log_index DESC
         LIMIT 10000`,
        { ttl: 0, maxRows: 10000 }
      );

    case "benchmark":
      return querySurf(
        `SELECT block_date,
                SUM(total_fees_usd) / NULLIF(SUM(total_txs), 0) AS avg_cost_usd,
                SUM(total_fees_usd) AS total_fees_usd,
                SUM(total_txs)      AS total_txs
         FROM agent.tempo_chain_daily
         WHERE block_date >= today() - ${days}
         GROUP BY block_date
         ORDER BY block_date`,
        { ttl: 0 }
      );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { section: string } }
) {
  const section = params.section as Section;
  if (!VALID_SECTIONS.includes(section)) {
    return jsonErr(`invalid section '${section}'`, 400);
  }

  const sp = req.nextUrl.searchParams;
  const range = sp.get("range") ?? "30d";
  const format = (sp.get("format") ?? "csv").toLowerCase();
  const days = rangeToDays(range);

  try {
    const raw = await fetchSection(section, days);
    const rows = normalizeRows(raw);

    if (format === "json") {
      return NextResponse.json(
        {
          data: rows,
          meta: {
            timestamp: new Date().toISOString(),
            range,
            cache_hit: false,
            freshness: new Date().toISOString(),
            section,
            row_count: rows.length,
          },
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const csv = toCsv(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tempo_${section}_${range}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return jsonErr(msg);
  }
}
