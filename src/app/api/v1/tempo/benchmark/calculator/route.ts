import { NextRequest } from "next/server";
import { rangeToDays } from "@/lib/surf";
import { jsonOK, jsonErr, num } from "@/lib/api";
import { computeBenchmark, BENCHMARK_METHODOLOGY } from "@/lib/benchmark";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const range = sp.get("range") ?? "30d";
  rangeToDays(range);

  const monthlyTransfers = num(sp.get("monthly_transfers"), 10_000);
  const monthlySwaps = num(sp.get("monthly_swaps"), 0);

  try {
    const rows = await computeBenchmark();
    // Assume transfers + swaps are both "txs" (each costs avg_cost_usd).
    const totalOps = monthlyTransfers + monthlySwaps;
    const projections = rows.map((r) => ({
      ...r,
      monthly_transfers: monthlyTransfers,
      monthly_swaps: monthlySwaps,
      projected_monthly_cost_usd: r.avg_cost_usd * totalOps,
    }));

    return jsonOK(
      {
        chains: projections,
        inputs: { monthly_transfers: monthlyTransfers, monthly_swaps: monthlySwaps },
        methodology: BENCHMARK_METHODOLOGY,
      },
      range
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return jsonErr(msg);
  }
}
