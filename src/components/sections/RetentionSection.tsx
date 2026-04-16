"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/fetcher";
import { fmtNum, cn } from "@/lib/utils";
import { TEMPO_LAUNCH_DATE } from "@/lib/constants";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { SkeletonCard } from "@/components/ui/SkeletonCard";

interface CohortPoint {
  activity_week: string;
  weeks_since: number;
  active_users: number;
  retention_rate: number;
}

interface Cohort {
  cohort_week: string;
  cohort_size: number;
  points: CohortPoint[];
}

interface RetentionData {
  cohorts: Cohort[];
  max_weeks_since: number;
}

interface Envelope<T> {
  data: T;
  meta?: { freshness: string };
}

const MAX_DISPLAY_WEEKS = 8;
const MS_PER_WEEK = 7 * 86_400_000;

function cellBg(rate: number): string {
  const alpha = 0.08 + (Math.max(0, Math.min(100, rate)) / 100) * 0.82;
  return `rgba(108, 92, 231, ${alpha.toFixed(3)})`;
}

function fmtCohortLabel(d: string): string {
  if (!d) return "—";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Has this activity week already elapsed (i.e. should we expect data)? */
function isActivityWeekPast(cohortWeek: string, weeksSince: number): boolean {
  const cohortMs = new Date(cohortWeek + "T00:00:00Z").getTime();
  if (Number.isNaN(cohortMs)) return false;
  const activityEndMs = cohortMs + (weeksSince + 1) * MS_PER_WEEK;
  return activityEndMs <= Date.now();
}

export function RetentionSection() {
  const { data, isPending: isLoading, isError, refetch } = useQuery({
    queryKey: ["retention-cohorts"],
    queryFn: () => fetcher<Envelope<RetentionData>>(`/api/v1/tempo/retention/cohorts`),
    select: (r) => r.data,
  });

  const {
    cappedLabel,
    weekKeys,
    cohorts,
    avgByWeek,
    bestCohort,
    mostRecent,
  } = useMemo(() => {
    const rawCohorts = data?.cohorts ?? [];
    const rawMax = data?.max_weeks_since ?? 0;

    // Cap columns to the lesser of data max, MAX_DISPLAY_WEEKS, and weeks
    // since launch so we don't show a wall of future-empty columns.
    const weeksSinceLaunch = Math.floor(
      (Date.now() - new Date(TEMPO_LAUNCH_DATE + "T00:00:00Z").getTime()) / MS_PER_WEEK
    );
    const mw = Math.min(rawMax, MAX_DISPLAY_WEEKS, Math.max(1, weeksSinceLaunch));
    const capped = rawMax > mw;
    const keys = Array.from({ length: mw + 1 }, (_, i) => i);

    // For averages, include 0% for past weeks with no data point so the
    // average reflects reality instead of only counting non-zero cohorts.
    const byWeek: Record<number, number[]> = {};
    for (const c of rawCohorts) {
      const pointByW = new Map<number, CohortPoint>();
      for (const p of c.points) pointByW.set(p.weeks_since, p);

      for (const w of keys) {
        if (w === 0) continue; // skip self-week
        const p = pointByW.get(w);
        const past = isActivityWeekPast(c.cohort_week, w);
        if (p) {
          if (!byWeek[w]) byWeek[w] = [];
          byWeek[w].push(p.retention_rate);
        } else if (past) {
          // Activity week elapsed but no data → 0% retention
          if (!byWeek[w]) byWeek[w] = [];
          byWeek[w].push(0);
        }
      }
    }
    const avg: Record<number, number | null> = {};
    for (const k of keys) {
      const arr = byWeek[k];
      avg[k] = arr && arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    }

    let best: { cohort: Cohort; rate: number; week: number } | null = null;
    for (const c of rawCohorts) {
      if (c.cohort_size < 100) continue;
      const w1 = c.points.find((p) => p.weeks_since === 1);
      const candidate = w1
        ? { rate: w1.retention_rate, week: 1 }
        : c.points
            .filter((p) => p.weeks_since > 0)
            .sort((a, b) => b.weeks_since - a.weeks_since)[0]
            ? (() => {
                const p = c.points
                  .filter((pp) => pp.weeks_since > 0)
                  .sort((a, b) => b.weeks_since - a.weeks_since)[0];
                return { rate: p.retention_rate, week: p.weeks_since };
              })()
            : null;
      if (!candidate) continue;
      if (!best || candidate.rate > best.rate) {
        best = { cohort: c, rate: candidate.rate, week: candidate.week };
      }
    }

    const sortedByDate = [...rawCohorts].sort((a, b) =>
      a.cohort_week < b.cohort_week ? -1 : 1
    );
    const recent = sortedByDate.length ? sortedByDate[sortedByDate.length - 1] : null;

    return {
      cappedLabel: capped,
      weekKeys: keys,
      cohorts: sortedByDate,
      avgByWeek: avg,
      bestCohort: best,
      mostRecent: recent,
    };
  }, [data]);

  const empty = !isLoading && cohorts.length === 0;

  const gridTemplate = `80px 64px repeat(${Math.max(1, weekKeys.length)}, minmax(0, 1fr))`;

  return (
    <section className="space-y-8">
      <SectionHeader
        id="retention"
        eyebrow="Community"
        title="Weekly Cohort Retention"
        subtitle="Share of each week's new users still active in later weeks."
        accent="tempo"
        showRange={false}
      />

      {isError ? (
        <Card className="bg-accent-negative/5 border-accent-negative/20">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-accent-negative">
              Failed to load retention cohorts.
            </span>
            <button
              onClick={() => refetch()}
              className="text-accent-tempo hover:underline text-xs font-medium"
            >
              Retry
            </button>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {isLoading ? (
            <SkeletonCard variant="chart" height={360} />
          ) : (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Cohort Heatmap</CardTitle>
                  <p className="text-xs text-text-muted mt-1">
                    Rows are weekly cohorts (first-seen week). Columns are weeks since cohort start.
                  </p>
                </div>
              </CardHeader>

              {empty ? (
                <div className="py-10 text-center text-sm text-text-muted">
                  No cohort data yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[520px]">
                    <div
                      className="grid gap-1 items-center px-1 pb-2"
                      style={{ gridTemplateColumns: gridTemplate }}
                    >
                      <div className="text-[10px] uppercase tracking-wider text-text-muted">
                        Cohort
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-text-muted text-right pr-1">
                        Size
                      </div>
                      {weekKeys.map((w) => (
                        <div
                          key={w}
                          className="text-[10px] uppercase tracking-wider text-text-muted text-center"
                        >
                          {cappedLabel && w === MAX_DISPLAY_WEEKS ? "W8+" : `W${w}`}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1">
                      {cohorts.map((c) => {
                        const pointByWeek = new Map<number, CohortPoint>();
                        for (const p of c.points) {
                          pointByWeek.set(p.weeks_since, p);
                        }
                        return (
                          <div
                            key={c.cohort_week}
                            className="grid gap-1 items-center px-1"
                            style={{ gridTemplateColumns: gridTemplate }}
                          >
                            <div className="font-medium text-xs text-text-secondary">
                              {fmtCohortLabel(c.cohort_week)}
                            </div>
                            <div className="text-xs text-text-muted tabular-nums text-right pr-1">
                              {fmtNum(c.cohort_size)}
                            </div>
                            {weekKeys.map((w) => {
                              const p = pointByWeek.get(w);
                              const past = isActivityWeekPast(c.cohort_week, w);

                              // Determine the effective rate:
                              // W0 = 100% by definition (self-week)
                              // Past week with no data = 0% retention
                              // Future week = no data yet (gray cell)
                              let rate: number | null = null;
                              let activeUsers = 0;
                              if (p) {
                                rate = p.retention_rate;
                                activeUsers = p.active_users;
                              } else if (w === 0) {
                                rate = 100;
                                activeUsers = c.cohort_size;
                              } else if (past) {
                                rate = 0;
                                activeUsers = 0;
                              }

                              if (rate === null) {
                                // Future week — show empty placeholder
                                return (
                                  <div
                                    key={w}
                                    className="h-10 w-full rounded-md bg-bg-card/40 border border-border-subtle/40"
                                    title="Not yet elapsed"
                                  />
                                );
                              }

                              const textCls =
                                rate >= 60 ? "text-white" : "text-text-primary";
                              return (
                                <div
                                  key={w}
                                  className={cn(
                                    "h-10 w-full rounded-md flex items-center justify-center text-[11px] tabular-nums border border-border-subtle/40",
                                    textCls
                                  )}
                                  style={{ backgroundColor: cellBg(rate) }}
                                  title={`${rate.toFixed(1)}% — ${fmtNum(
                                    activeUsers
                                  )} / ${fmtNum(c.cohort_size)} active`}
                                >
                                  {rate.toFixed(0)}%
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>

        <div>
          {isLoading ? (
            <SkeletonCard variant="chart" height={360} />
          ) : (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Retention Summary</CardTitle>
                  <p className="text-xs text-text-muted mt-1">
                    Averages across cohorts, excluding the W0 self-week.
                  </p>
                </div>
              </CardHeader>

              {empty ? (
                <div className="py-8 text-center text-sm text-text-muted">—</div>
              ) : (
                <div className="space-y-5">
                  {[1, 2, 4].map((w) => {
                    const avg = avgByWeek[w];
                    const has = avg !== null && avg !== undefined;
                    const width = has ? Math.max(2, Math.min(100, avg as number)) : 0;
                    return (
                      <div key={w}>
                        <div className="flex items-baseline justify-between mb-1.5">
                          <span className="text-xs text-text-secondary">
                            Week {w} retention
                          </span>
                          <span className="text-sm font-medium text-text-primary tabular-nums">
                            {has ? `${(avg as number).toFixed(1)}%` : "—"}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-bg-card-hover/60 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${width}%`,
                              background:
                                "linear-gradient(90deg, rgba(108,92,231,0.5), #6C5CE7)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  <div className="pt-3 border-t border-border-subtle space-y-2">
                    {bestCohort ? (
                      <div className="text-xs text-text-secondary">
                        <span className="text-text-muted">Best cohort: </span>
                        <span className="text-text-primary font-medium">
                          {fmtCohortLabel(bestCohort.cohort.cohort_week)}
                        </span>
                        <span className="text-text-muted">
                          {" "}
                          · {bestCohort.rate.toFixed(0)}% at W{bestCohort.week}
                        </span>
                      </div>
                    ) : null}
                    {mostRecent ? (
                      <div className="text-xs text-text-secondary">
                        <span className="text-text-muted">Most recent: </span>
                        <span className="text-text-primary font-medium">
                          {fmtCohortLabel(mostRecent.cohort_week)}
                        </span>
                        <span className="text-text-muted">
                          {" "}
                          · {fmtNum(mostRecent.cohort_size)} users
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <p className="text-[11px] leading-relaxed text-text-muted pt-2">
                    {(() => {
                      const weeks = Math.floor(
                        (Date.now() - new Date(TEMPO_LAUNCH_DATE + "T00:00:00Z").getTime()) /
                          (7 * 86_400_000)
                      );
                      return `Tempo is ${weeks} week${weeks !== 1 ? "s" : ""} old — retention data will expand over time.`;
                    })()}
                  </p>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
