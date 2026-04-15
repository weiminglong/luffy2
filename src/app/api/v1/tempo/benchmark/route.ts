import { NextRequest } from "next/server";
import { rangeToDays } from "@/lib/surf";
import { jsonOK, jsonErr } from "@/lib/api";
import { computeBenchmark, BENCHMARK_METHODOLOGY } from "@/lib/benchmark";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") ?? "30d";
  rangeToDays(range); // validate

  try {
    const rows = await computeBenchmark();
    return jsonOK(
      { chains: rows, methodology: BENCHMARK_METHODOLOGY },
      range
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return jsonErr(msg);
  }
}
