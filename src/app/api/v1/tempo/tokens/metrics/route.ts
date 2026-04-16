import { NextRequest } from "next/server";
import { querySurf, epochToDate, rangeToDays } from "@/lib/surf";
import { jsonOK, jsonErr, num, str } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") ?? "30d";
  const days = rangeToDays(range);

  try {
    // Aggregate token activity per day across all tokens
    const tsSql = `
      SELECT
        block_date,
        SUM(transfer_count)        AS transfers,
        SUM(volume_usd)            AS volume_usd,
        SUM(unique_senders)        AS senders,
        SUM(unique_receivers)      AS receivers,
        COUNT(DISTINCT token_symbol) AS active_tokens
      FROM agent.tempo_token_metrics_daily
      WHERE block_date >= today() - ${days}
        AND token_symbol NOT IN ('UNKNOWN', '', 'ENSH', 'TDOGE')
      GROUP BY block_date
      ORDER BY block_date
    `;

    // Per-token daily breakdown for the top 5 tokens by recent volume
    const byTokenSql = `
      SELECT
        t.block_date,
        t.token_symbol,
        t.transfer_count AS transfers,
        t.volume_usd
      FROM agent.tempo_token_metrics_daily AS t
      INNER JOIN (
        SELECT token_symbol
        FROM agent.tempo_token_metrics_daily
        WHERE block_date >= today() - 7
          AND token_symbol NOT IN ('UNKNOWN', '', 'ENSH', 'TDOGE')
        GROUP BY token_symbol
        ORDER BY SUM(volume_usd) DESC
        LIMIT 5
      ) AS top ON t.token_symbol = top.token_symbol
      WHERE t.block_date >= today() - ${days}
      ORDER BY t.block_date, t.token_symbol
    `;

    const [tsRows, byTokenRows] = await Promise.all([
      querySurf(tsSql, { ttl: 1800 }),
      querySurf(byTokenSql, { ttl: 1800 }),
    ]);

    const timeseries = tsRows.map((r) => ({
      block_date: epochToDate(r.block_date as number | string | null),
      transfers: num(r.transfers),
      volume_usd: num(r.volume_usd),
      senders: num(r.senders),
      receivers: num(r.receivers),
      active_tokens: num(r.active_tokens),
    }));

    // Pivot by_token rows into per-date objects with token columns
    const tokenSet = new Set<string>();
    const dateMap = new Map<string, Record<string, number>>();
    for (const r of byTokenRows) {
      const date = epochToDate(r.block_date as number | string | null);
      const token = str(r.token_symbol);
      tokenSet.add(token);
      if (!dateMap.has(date)) dateMap.set(date, {});
      const entry = dateMap.get(date)!;
      entry[token] = num(r.volume_usd);
    }
    const tokens = Array.from(tokenSet);
    const by_token_timeseries = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => {
        const row: Record<string, string | number> = { block_date: date };
        for (const t of tokens) row[t] = vals[t] ?? 0;
        return row;
      });

    const freshness = timeseries.length
      ? timeseries[timeseries.length - 1].block_date
      : undefined;

    return jsonOK(
      { timeseries, by_token_timeseries, tokens },
      range,
      freshness
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return jsonErr(msg);
  }
}
