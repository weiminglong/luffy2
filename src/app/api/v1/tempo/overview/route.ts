import { NextRequest } from "next/server";
import { querySurf, epochToDate, NOT_UNKNOWN, rangeToDays } from "@/lib/surf";
import { jsonOK, jsonErr, num, pctChange } from "@/lib/api";

export const runtime = "nodejs";

interface KPI {
  value: number;
  prior: number;
  change_pct: number;
}

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") ?? "30d";
  const days = rangeToDays(range);

  try {
    // Chain-level: get latest + 7d-prior + 30d-prior in one shot via conditional aggregation.
    const chainSql = `
      SELECT
        argMax(dau, block_date) AS dau_latest,
        argMax(total_txs, block_date) AS txs_latest,
        argMax(total_fees_usd, block_date) AS fees_latest,
        argMax(dex_volume_usd, block_date) AS dex_vol_latest,
        argMax(dex_trade_count, block_date) AS dex_swaps_latest,
        max(block_date) AS latest_date,
        anyIf(dau, block_date = today() - 30) AS dau_prior_30d,
        anyIf(dau, block_date = today() - 7)  AS dau_prior_7d,
        anyIf(total_txs, block_date = today() - 7) AS txs_prior_7d,
        anyIf(total_fees_usd, block_date = today() - 7) AS fees_prior_7d,
        anyIf(dex_volume_usd, block_date = today() - 7) AS dex_vol_prior_7d,
        anyIf(dex_trade_count, block_date = today() - 7) AS dex_swaps_prior_7d
      FROM agent.tempo_chain_daily
      WHERE block_date >= today() - ${days}
    `;
    const chainRows = await querySurf(chainSql, { ttl: 300 });
    const c = chainRows[0] ?? {};

    const dauLatest = num(c.dau_latest);
    const txsLatest = num(c.txs_latest);
    const feesLatest = num(c.fees_latest);
    const dexVolLatest = num(c.dex_vol_latest);
    const dexSwapsLatest = num(c.dex_swaps_latest);

    const dauPrior = num(c.dau_prior_30d);
    const txsPrior = num(c.txs_prior_7d);
    const feesPrior = num(c.fees_prior_7d);
    const dexVolPrior = num(c.dex_vol_prior_7d);
    const dexSwapsPrior = num(c.dex_swaps_prior_7d);

    // Stablecoin supply: derived from all-time bridge net flows, restricted to
    // canonical stables. The tempo_stablecoin_supply table is unreliable
    // (massively under-reports); bridge flows are authoritative for L2
    // circulating supply.
    const supplySql = `
      SELECT
        sumIf(net_flow_usd, block_date <= today())          AS supply_latest,
        sumIf(net_flow_usd, block_date <= today() - 30)     AS supply_prior_30d
      FROM agent.tempo_bridge_flows_daily
      WHERE ${NOT_UNKNOWN}
        AND token_symbol IN ('USDC.e', 'pathUSD', 'USDS')
    `;
    const supplyRows = await querySurf(supplySql, { ttl: 300 });
    const s = supplyRows[0] ?? {};
    const supplyLatest = num(s.supply_latest);
    const supplyPrior = num(s.supply_prior_30d);

    const kpi = (v: number, p: number): KPI => ({
      value: v,
      prior: p,
      change_pct: pctChange(v, p),
    });

    const data = {
      dau: kpi(dauLatest, dauPrior),
      txs: kpi(txsLatest, txsPrior),
      fees: kpi(feesLatest, feesPrior),
      dex_volume: kpi(dexVolLatest, dexVolPrior),
      dex_swaps: kpi(dexSwapsLatest, dexSwapsPrior),
      stablecoin_supply: kpi(supplyLatest, supplyPrior),
      latest_date: epochToDate(c.latest_date as number | string | null),
    };

    return jsonOK(data, range, data.latest_date || undefined);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return jsonErr(msg);
  }
}
