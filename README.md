# Tempo Benchmark Dashboard

Real-time on-chain analytics and cross-chain cost benchmarks for Tempo, with full coverage of all 8 agent-accessible Tempo tables. Powered by the Surf onchain SQL API.

## What it shows

Eight scrollable sections covering the full Tempo on-chain footprint:

1. **Hero** — DAU, 24h transactions, stablecoin supply, DEX volume + 6 secondary KPIs (WAU, MAU, new users, sponsored %, MPP volume, active merchants)
2. **Cost Benchmark Arena** — per-tx cost vs Ethereum / Base / Arbitrum, with interactive savings calculator and methodology disclosure
3. **Chain Health** — DAU/WAU/MAU trends, new vs returning users, daily transactions, fee revenue + sponsored share, DEX volume
4. **Stablecoin Ecosystem** — supply by token (donut), cumulative supply over time, daily transfers, bridge inflow/outflow Sankey, top senders/receivers
5. **DEX Activity** — daily swap count, unique traders, top trading pairs, swap-size distribution, live swap feed
6. **Merchant Payments (MPP)** — payment volume by token, payment count, token mix, top merchants, recent payments with decoded memos
7. **Transfer Explorer** — daily count/volume/unique addresses, top tokens, recent transfers
8. **Footer CTA** — methodology, links, "Build Your Own" call-to-action

## Tech stack

- **Next.js 14** App Router (Node runtime — required for shelling out to `surf`)
- **TypeScript** (strict)
- **Tailwind CSS** with custom design tokens
- **Recharts** for charts, **d3-sankey** for the bridge flow diagram
- **Framer Motion** for tasteful entrance animations
- **TanStack Query** for client-side data fetching with cache + retry
- **Zustand** for the global time-range store

## Data layer

All on-chain data flows through `src/lib/surf.ts`, which shells out to the
local `surf` CLI's `onchain-sql` command. Key behaviours:

- **In-memory cache** with per-endpoint TTL (5 min – 1 h) — Surf credits matter.
- **In-flight dedupe** so duplicate concurrent calls share a single request.
- **Concurrency gate** (default 3) — Surf throttles aggressive parallel callers.
- **Critical**: spawned with `stdio: ["ignore", "pipe", "pipe"]`. Default
  Node `execFile`/`spawn` leaves stdin piped, which causes the Go-binary
  surf CLI to hang forever. This was the single hardest bug to find.

The 8 agent tables consumed: `tempo_chain_daily`, `tempo_stablecoin_supply`,
`tempo_transfers`, `tempo_bridge_flows_daily`, `tempo_dex_swaps`,
`tempo_mpp_metrics_daily`, `tempo_mpp_payees_daily`,
`tempo_transfer_with_memo_events`.

Plus competitor reference: `ethereum_chain_daily`, `base_chain_daily`,
`arbitrum_chain_daily`.

## Setup

Requires the `surf` CLI installed and authenticated:

```bash
which surf
```

Then:

```bash
npm install
echo "SURF_BIN=$(which surf)" > .env.local
npm run dev
# open http://localhost:3000
```

## API

All endpoints under `/api/v1/tempo/*`, returning `{ data, meta }` envelopes:

| Path | Description | Cache |
|---|---|---|
| `/overview` | 6 hero KPIs with prior-period delta | 5 m |
| `/overview/secondary` | 6 secondary KPIs | 5 m |
| `/benchmark` | Cross-chain cost comparison | 1 h |
| `/benchmark/calculator` | Savings projection | 1 h |
| `/chain/health` | Daily chain timeseries | 1 h |
| `/stablecoins/supply` | Per-token supply timeseries + cumulative | 1 h |
| `/stablecoins/transfers` | Stablecoin transfer activity + top wallets | 30 m |
| `/bridge/flows` | Bridge flow timeseries + by-token aggregates | 1 h |
| `/dex/activity` | Daily swap aggregates + top pairs | 30 m |
| `/dex/swaps` | Recent 50 swaps | none |
| `/mpp/metrics` | Daily payment metrics by token | 1 h |
| `/mpp/merchants` | Top merchants + active count timeseries | 1 h |
| `/mpp/feed` | Recent payments with decoded memos | 5 m |
| `/transfers/activity` | Daily transfer aggregates + top tokens | 30 m |
| `/transfers/feed` | Recent 50 transfers | none |
| `/export/[section]` | CSV / JSON export per section | none |

All accept `?range=7d|30d|90d|1y|all` (default `30d`).

## Repo layout

```
src/
├── app/
│   ├── api/v1/tempo/      # 16 route handlers
│   ├── layout.tsx         # Inter / Space Grotesk / JetBrains Mono
│   ├── page.tsx           # Composes all 8 sections
│   ├── providers.tsx      # TanStack Query provider
│   └── globals.css        # Design tokens + scrollbar + glass utilities
├── components/
│   ├── ui/                # Card, KPICard, DeltaBadge, ChainBadge, Header,
│   │                      # Sidebar, RankingTable, LiveFeed,
│   │                      # SavingsCalculator, SkeletonCard,
│   │                      # SectionHeader, TimeRangeSelector
│   ├── charts/            # TimeseriesChart, BenchmarkBar, DonutChart,
│   │                      # FlowSankey, Sparkline
│   └── sections/          # 8 page sections + Footer
└── lib/
    ├── surf.ts            # CLI wrapper + cache + concurrency gate
    ├── api.ts             # Response envelope helpers
    ├── benchmark.ts       # Cross-chain cost computation
    ├── store.ts           # Zustand range store
    ├── fetcher.ts         # TanStack Query fetcher
    └── utils.ts           # fmtUSD / fmtNum / fmtPct / shortAddr / cn
```

## Known data caveats

- **Tempo is ~3 weeks old** (launched 2026-03-25). 30-day deltas are
  zero-floored; the dashboard uses 7-day deltas where possible.
- **Bridge flows are restricted to canonical stablecoins** (USDC.e, pathUSD,
  USDS) to avoid a single $100M outlier mint dwarfing the chart.
- **`UNKNOWN` token symbol** is filtered from stablecoin / MPP / bridge /
  transfer aggregations — it represents unindexed token contracts.
- **Benchmark uses hardcoded gas-token prices** ($3500 ETH). Methodology card
  in the Cost Benchmark section discloses this.
