# Tempo Dashboard — Agent Context

This file is the single source of truth for parallel agents building the Tempo
Benchmark Dashboard. **Read fully before writing any code.**

Repo: `/Users/zhouzijin/tempo-dashboard` — Next.js 14 App Router, TypeScript,
Tailwind, Recharts, Framer Motion, TanStack Query.

## Data access

All data is queried via the `surf` CLI (already installed). Use the helper at
`src/lib/surf.ts`:

```ts
import { querySurf, epochToDate, NOT_UNKNOWN } from "@/lib/surf";

const rows = await querySurf(
  `SELECT block_date, dau FROM agent.tempo_chain_daily
   WHERE block_date >= today() - 30 ORDER BY block_date`,
  { ttl: 300 } // seconds; 0 disables cache
);
```

**Critical rules:**
- All tables live in `agent.*` database. Always use `agent.tempo_*` etc.
- Always filter on `block_date` — partition key.
- `block_date` comes back as **Unix epoch seconds** (UInt32) — convert with `epochToDate()` for ISO `YYYY-MM-DD` or `epochToShort()` for `Apr 14`.
- Tempo went live ~2026-03-25, only ~21 days of data exist. Use `today() - 30` for safety.
- **Filter dirty data**: tempo_stablecoin_supply / tempo_mpp_metrics_daily / tempo_bridge_flows_daily contain a `token_symbol = 'UNKNOWN'` bucket with junk values (132B mint volume etc). Always exclude with `AND token_symbol NOT IN ('UNKNOWN', '')` (use `NOT_UNKNOWN` constant).
- Use single quotes for ClickHouse strings.
- Max 10K rows, 30s timeout.

## Tempo table schemas (verified)

### `agent.tempo_chain_daily`
`block_date Date | total_blocks UInt64 | total_txs UInt64 | user_txs UInt64 | dau UInt64 | wau UInt64 | mau UInt64 | new_users UInt64 | returning_users UInt64 | total_transfers UInt64 | stablecoin_transfer_volume Float64 | stablecoin_dau UInt64 | stablecoin_txns UInt64 | unique_tokens_transferred UInt64 | bridge_net_flow_usd Float64 | total_fees_usd Float64 | avg_fee_usd Float64 | median_fee_usd Float64 | sponsored_fee_pct Float64 | dex_volume_usd Float64 | dex_trade_count UInt64 | contract_deployments_from_traces UInt64 | batched_tx_count UInt64`

### `agent.tempo_stablecoin_supply`
`block_date | token_address | token_symbol | mint_count UInt64 | burn_count UInt64 | mint_volume_usd Float64 | burn_volume_usd Float64 | net_supply_change_usd Float64`
**No cumulative supply column** — compute via `SUM(net_supply_change_usd) OVER (PARTITION BY token_symbol ORDER BY block_date)` or aggregate over the full window.

### `agent.tempo_transfers`
`block_date | block_number | transaction_index | log_index | transaction_hash | transfer_from | transfer_to | amount_usd Float64 | token_address | token_symbol`
Tx-level. Filter on `block_date` first, then aggregate.

### `agent.tempo_bridge_flows_daily`
`block_date | token_address | token_symbol | inflow_count UInt64 | inflow_usd Float64 | outflow_count UInt64 | outflow_usd Float64 | net_flow_usd Float64 | cumulative_net_flow_usd Float64`

### `agent.tempo_dex_swaps`
`block_date | block_number | transaction_index | transaction_hash | user_address | token_in | token_in_symbol | amount_in_usd Float64 | token_out | token_out_symbol | amount_out_usd Float64 | reason_hex String`

### `agent.tempo_mpp_metrics_daily`
`block_date | token_address | token_symbol | payment_count UInt64 | volume_usd Float64 | avg_payment_usd Float64 | median_payment_usd Float64 | unique_payers UInt64 | unique_payees UInt64 | unique_memos UInt64`

### `agent.tempo_mpp_payees_daily`
`block_date | transfer_to | token_address | token_symbol | payment_count UInt64 | volume_usd Float64 | avg_payment_usd Float64 | median_payment_usd Float64 | unique_payers UInt64 | unique_memos UInt64`

### `agent.tempo_transfer_with_memo_events`
`block_date | block_number | transaction_index | log_index | transaction_hash | transfer_from | transfer_to | memo_hex String | amount_usd Float64 | token_address | token_symbol`

## Competitor tables (for benchmark)

### `agent.{ethereum|base|arbitrum}_chain_daily`
`block_date | tx_count | successful_tx_count | active_senders | active_receivers | total_gas_used UInt64 | avg_gas_price_gwei Float64 | total_native_transferred Float64 | contract_deployments`
Compute avg gas per tx: `total_gas_used / NULLIF(tx_count, 0)`

### `agent.{ethereum|base}_fees_daily`
`blockchain | project | version | block_date | daily_fees_usd Float64 | daily_user_fees_usd | daily_revenue_usd | ...`

## Data freshness reference (Apr 14 2026)
- Latest Tempo `block_date`: 2026-04-14 (epoch 1776211200)
- Earliest: 2026-03-25 (epoch 1774483200)
- DAU range: 5K–8K  | Tx/day: 150K–270K  | Fees/day: $1K–5K
- Median fee: $0.005–0.01 USD  | Sponsored: 5–14%
- Real stablecoins on Tempo: USDC.e, pathUSD, USDS

## Color tokens (Tailwind)
- `bg-bg-primary` (#0A0B0F), `bg-bg-card` (#12131A), `bg-bg-card-hover` (#1A1B24)
- `border-border-subtle` (#1E2030), `border-border-strong` (#2A2D42)
- `text-text-primary` (#F0F0F5), `text-text-secondary` (#8B8D9E), `text-text-muted` (#5A5C70)
- `text-accent-tempo` (#6C5CE7), `text-accent-positive` (#00CEC9), `text-accent-negative` (#FD7272), `text-accent-stablecoin` (#2ED573)
- `text-chain-ethereum`, `-base`, `-arbitrum`, `-tempo`, etc.

Use `cn()` from `@/lib/utils` for class merging.
Use `fmtUSD`, `fmtNum`, `fmtPct`, `shortAddr`, `pctChange` from `@/lib/utils`.

## API response envelope (consistent shape)

```ts
{
  data: T,
  meta: {
    timestamp: string,        // ISO
    range: string,            // "30d" | "7d" | ...
    cache_hit: boolean,
    freshness: string         // ISO of latest block_date in result
  }
}
```

Implement via helper:
```ts
import { NextRequest, NextResponse } from "next/server";
export async function jsonOK(data: unknown, range: string, freshness?: string) {
  return NextResponse.json({
    data,
    meta: {
      timestamp: new Date().toISOString(),
      range,
      cache_hit: false,
      freshness: freshness ?? new Date().toISOString(),
    },
  });
}
```

## Endpoints (16)

All under `src/app/api/v1/tempo/`. Use `route.ts` with `GET` exports.
Edge runtime NOT required — surf CLI needs Node runtime. Add `export const runtime = "nodejs"`.

| Path | Source | Cache TTL |
|---|---|---|
| `/overview` | tempo_chain_daily, tempo_stablecoin_supply | 300s |
| `/overview/secondary` | chain_daily, dex_swaps, mpp_metrics_daily, mpp_payees_daily | 300s |
| `/benchmark` | tempo_chain_daily + ethereum/base/arbitrum chain_daily | 3600s |
| `/benchmark/calculator` | benchmark cached | 3600s |
| `/chain/health` | tempo_chain_daily | 3600s |
| `/stablecoins/supply` | tempo_stablecoin_supply | 3600s |
| `/stablecoins/transfers` | tempo_transfers (stablecoin filter) | 1800s |
| `/bridge/flows` | tempo_bridge_flows_daily | 3600s |
| `/dex/activity` | tempo_dex_swaps | 1800s |
| `/dex/swaps` | tempo_dex_swaps | 0 |
| `/mpp/metrics` | tempo_mpp_metrics_daily | 3600s |
| `/mpp/merchants` | tempo_mpp_payees_daily | 3600s |
| `/mpp/feed` | tempo_transfer_with_memo_events | 300s |
| `/transfers/activity` | tempo_transfers | 1800s |
| `/transfers/feed` | tempo_transfers | 0 |
| `/export/[section]` | varies | 0 |
