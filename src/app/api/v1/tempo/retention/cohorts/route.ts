import { NextRequest } from "next/server";
import { querySurf, epochToDate } from "@/lib/surf";
import { jsonOK, jsonErr, num } from "@/lib/api";

export const runtime = "nodejs";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(req: NextRequest) {
  try {
    const sql = `
      SELECT cohort_week, activity_week, cohort_size, active_users, retention_rate
      FROM agent.tempo_user_cohorts
      WHERE cohort_week >= today() - 365
      ORDER BY cohort_week, activity_week
    `;
    const rows = await querySurf(sql, { ttl: 3600, maxRows: 10000 });

    const WEEK_SECONDS = 604800;
    const cohortMap = new Map<
      string,
      {
        cohort_week: string;
        cohort_size: number;
        cohort_epoch: number;
        points: Array<{
          activity_week: string;
          weeks_since: number;
          active_users: number;
          retention_rate: number;
        }>;
      }
    >();

    let maxWeeksSince = 0;

    for (const r of rows) {
      const cohortEpoch = typeof r.cohort_week === "string"
        ? parseInt(r.cohort_week, 10)
        : (r.cohort_week as number);
      const activityEpoch = typeof r.activity_week === "string"
        ? parseInt(r.activity_week, 10)
        : (r.activity_week as number);
      if (!Number.isFinite(cohortEpoch) || !Number.isFinite(activityEpoch)) continue;

      const cohortDate = epochToDate(cohortEpoch);
      const activityDate = epochToDate(activityEpoch);
      const weeksSince = Math.round((activityEpoch - cohortEpoch) / WEEK_SECONDS);
      if (weeksSince > maxWeeksSince) maxWeeksSince = weeksSince;

      let cohort = cohortMap.get(cohortDate);
      if (!cohort) {
        cohort = {
          cohort_week: cohortDate,
          cohort_size: num(r.cohort_size),
          cohort_epoch: cohortEpoch,
          points: [],
        };
        cohortMap.set(cohortDate, cohort);
      } else if (num(r.cohort_size) > cohort.cohort_size) {
        cohort.cohort_size = num(r.cohort_size);
      }

      cohort.points.push({
        activity_week: activityDate,
        weeks_since: weeksSince,
        active_users: num(r.active_users),
        retention_rate: num(r.retention_rate),
      });
    }

    const cohorts = Array.from(cohortMap.values())
      .sort((a, b) => a.cohort_epoch - b.cohort_epoch)
      .map(({ cohort_week, cohort_size, points }) => ({
        cohort_week,
        cohort_size,
        points,
      }));

    const freshness = cohorts.length
      ? cohorts[cohorts.length - 1].cohort_week
      : undefined;

    return jsonOK(
      { cohorts, max_weeks_since: maxWeeksSince },
      "all",
      freshness
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return jsonErr(msg);
  }
}
