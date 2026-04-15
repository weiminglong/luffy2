import { querySurf } from "@/lib/surf";
import { num } from "@/lib/api";

/**
 * Hardcoded gas token prices (USD). Good enough for a cost-comparison
 * benchmark; not used for any live pricing.
 */
export const GAS_TOKEN_USD: Record<string, number> = {
  ETH: 3500,
  MATIC: 0.5,
  BNB: 600,
};

export interface BenchmarkRow {
  chain: "tempo" | "ethereum" | "base" | "arbitrum";
  avg_cost_usd: number;
  avg_gas_price_gwei?: number;
  avg_gas_per_tx?: number;
  savings_vs_eth_x: number;
}

export async function computeBenchmark(): Promise<BenchmarkRow[]> {
  // Tempo: real observed fee / tx
  const tempoSql = `
    SELECT
      SUM(total_fees_usd) AS fees,
      SUM(total_txs)      AS txs
    FROM agent.tempo_chain_daily
    WHERE block_date >= today() - 7
  `;

  // Ethereum / Base / Arbitrum share the same schema.
  const makeCompetitorSql = (chain: string) => `
    SELECT
      AVG(avg_gas_price_gwei)                         AS gwei,
      AVG(total_gas_used / NULLIF(tx_count, 0))       AS gas_per_tx
    FROM agent.${chain}_chain_daily
    WHERE block_date >= today() - 7
  `;

  const [tempoRows, ethRows, baseRows, arbRows] = await Promise.all([
    querySurf(tempoSql, { ttl: 3600 }),
    querySurf(makeCompetitorSql("ethereum"), { ttl: 3600 }),
    querySurf(makeCompetitorSql("base"),     { ttl: 3600 }),
    querySurf(makeCompetitorSql("arbitrum"), { ttl: 3600 }),
  ]);

  const t = tempoRows[0] ?? {};
  const tempoFees = num(t.fees);
  const tempoTxs = num(t.txs);
  const tempoCost = tempoTxs > 0 ? tempoFees / tempoTxs : 0;

  const ethPrice = GAS_TOKEN_USD.ETH;

  const costFor = (row: Record<string, unknown> | undefined) => {
    if (!row) return { cost: 0, gwei: 0, gas: 0 };
    const gwei = num(row.gwei);
    const gas = num(row.gas_per_tx);
    const cost = gas * gwei * 1e-9 * ethPrice;
    return { cost, gwei, gas };
  };

  const eth = costFor(ethRows[0]);
  const base = costFor(baseRows[0]);
  const arb = costFor(arbRows[0]);

  const ethCost = eth.cost || 1e-12;

  const rows: BenchmarkRow[] = [
    {
      chain: "tempo",
      avg_cost_usd: tempoCost,
      savings_vs_eth_x: tempoCost > 0 ? ethCost / tempoCost : 0,
    },
    {
      chain: "ethereum",
      avg_cost_usd: eth.cost,
      avg_gas_price_gwei: eth.gwei,
      avg_gas_per_tx: eth.gas,
      savings_vs_eth_x: 1,
    },
    {
      chain: "base",
      avg_cost_usd: base.cost,
      avg_gas_price_gwei: base.gwei,
      avg_gas_per_tx: base.gas,
      savings_vs_eth_x: base.cost > 0 ? ethCost / base.cost : 0,
    },
    {
      chain: "arbitrum",
      avg_cost_usd: arb.cost,
      avg_gas_price_gwei: arb.gwei,
      avg_gas_per_tx: arb.gas,
      savings_vs_eth_x: arb.cost > 0 ? ethCost / arb.cost : 0,
    },
  ];

  return rows;
}

export const BENCHMARK_METHODOLOGY =
  "Tempo: observed 7-day SUM(total_fees_usd) / SUM(total_txs) from agent.tempo_chain_daily. " +
  "Ethereum/Base/Arbitrum: 7-day AVG(avg_gas_price_gwei) × AVG(total_gas_used / tx_count) × 1e-9 × $3500 ETH. " +
  "Gas-token prices are hardcoded ($3500 ETH) and not live quotes.";
