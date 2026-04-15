import { NextRequest } from "next/server";
import { querySurf } from "@/lib/surf";
import { jsonOK, jsonErr, num, str } from "@/lib/api";

export const runtime = "nodejs";

const KNOWN_LABELS: Record<string, string> = {
  "0x0000000000000000000000000000000000000001": "Precompile: ecrecover",
  "0x0000000000000000000000000000000000000002": "Precompile: sha256",
  "0x0000000000000000000000000000000000000004": "Precompile: identity",
  "0x0000000071727de22e5e9d8baf0edac6f37da032": "ERC-4337 EntryPoint v0.7",
};

function windowToDays(w: string): number {
  switch (w.toLowerCase()) {
    case "24h": return 1;
    case "7d": return 7;
    case "all": return 90;
    default: return 7;
  }
}

export async function GET(req: NextRequest) {
  const windowParam = (req.nextUrl.searchParams.get("window") ?? "7d").toLowerCase();
  const validWindow = ["24h", "7d", "all"].includes(windowParam) ? windowParam : "7d";
  const days = windowToDays(validWindow);

  try {
    const sql = `
      SELECT
        contract_address,
        sum(call_count) AS call_count,
        toFloat64(sum(total_gas_used)) AS total_gas_used,
        max(unique_callers) AS peak_unique_callers,
        sum(unique_callers) AS sum_unique_callers
      FROM agent.tempo_contract_calls_daily
      WHERE block_date >= today() - ${days}
      GROUP BY contract_address
      ORDER BY total_gas_used DESC
      LIMIT 25
    `;
    const rows = await querySurf(sql, { ttl: 600 });

    const result = rows.map((r, i) => {
      const addr = str(r.contract_address);
      const lower = addr.toLowerCase();
      const label = KNOWN_LABELS[lower];
      const entry: {
        rank: number;
        contract_address: string;
        call_count: number;
        total_gas_used: number;
        unique_callers: number;
        label?: string;
      } = {
        rank: i + 1,
        contract_address: addr,
        call_count: num(r.call_count),
        total_gas_used: num(r.total_gas_used),
        unique_callers: num(r.peak_unique_callers),
      };
      if (label) entry.label = label;
      return entry;
    });

    return jsonOK({ window: validWindow, rows: result }, validWindow);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return jsonErr(msg);
  }
}
