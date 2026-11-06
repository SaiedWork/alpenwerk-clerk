import { avg, count, eq, sql, sum } from "drizzle-orm";
import type { Db } from "@/db/client";
import {
  caseStatuses,
  cases,
  decisions,
  intents,
  llmCalls,
} from "@/db/schema/app";
import { berlinDayStart } from "@/lib/dates";
import { REVIEW_QUEUE_STATUSES } from "@/features/review/server/list-review-queue";
import type { KpiRaw } from "../view/kpi";

const zeroed = <K extends string>(keys: readonly K[]) =>
  Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;

/** All numbers on the KPI page, from a handful of small aggregate queries. */
export async function loadKpis(
  db: Db,
  now: Date = new Date(),
): Promise<KpiRaw> {
  const [decisionRows, intentRows, statusRows, handling, live, liveTotals] =
    await Promise.all([
      db
        .select({ key: cases.decision, n: count() })
        .from(cases)
        .groupBy(cases.decision),
      db
        .select({ key: cases.intent, n: count() })
        .from(cases)
        .groupBy(cases.intent),
      db
        .select({ key: cases.status, n: count() })
        .from(cases)
        .groupBy(cases.status),
      db
        .select({ ms: avg(cases.handlingMs) })
        .from(cases)
        .where(
          sql`${cases.status} = 'DONE' and ${cases.handlingMs} is not null`,
        ),
      db
        .select({ n: count() })
        .from(llmCalls)
        .where(
          sql`${llmCalls.cached} = false and ${llmCalls.at} >= ${berlinDayStart(now)}`,
        ),
      db
        .select({ n: count(), cost: sum(llmCalls.estCostUsd) })
        .from(llmCalls)
        .where(eq(llmCalls.cached, false)),
    ]);

  const byDecision = zeroed(decisions);
  const byIntent = zeroed(intents);
  const byStatus = zeroed(caseStatuses);
  let undecided = 0;
  let unrecognizedIntent = 0;
  for (const r of decisionRows) {
    if (r.key) byDecision[r.key] = r.n;
    else undecided = r.n;
  }
  for (const r of intentRows) {
    if (r.key) byIntent[r.key] = r.n;
    else unrecognizedIntent = r.n;
  }
  for (const r of statusRows) byStatus[r.key] = r.n;

  const ms = handling[0]?.ms;
  return {
    total: Object.values(byStatus).reduce((a, b) => a + b, 0),
    byDecision,
    undecided,
    byIntent,
    unrecognizedIntent,
    byStatus,
    waitingForHuman: REVIEW_QUEUE_STATUSES.reduce((a, s) => a + byStatus[s], 0),
    avgHandlingMs: ms === null || ms === undefined ? null : Number(ms),
    liveCallsToday: live[0]?.n ?? 0,
    liveCallsTotal: liveTotals[0]?.n ?? 0,
    estCostUsd: Number(liveTotals[0]?.cost ?? 0),
  };
}
