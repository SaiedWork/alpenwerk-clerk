import type { CaseStatus } from "@/agent/pipeline/types";
import type { Decision, Intent } from "@/agent/rules/types";

/** Raw counts as the database returns them. Every key is present, with 0 for "none". */
export type KpiRaw = {
  total: number;
  byDecision: Record<Decision, number>;
  /** Cases without a decision yet (still being analyzed or failed early). */
  undecided: number;
  byIntent: Record<Intent, number>;
  unrecognizedIntent: number;
  byStatus: Record<CaseStatus, number>;
  waitingForHuman: number;
  /** Mean handling time of `DONE` cases in ms, or null without any. */
  avgHandlingMs: number | null;
  liveCallsToday: number;
  liveCallsTotal: number;
  estCostUsd: number;
};

export type KpiView = KpiRaw & {
  decided: number;
  /** Share of decided cases that were `AUTO_EXECUTE`, 0-100, or null before any decision. */
  autoSharePct: number | null;
};

/** Derives the shares. Pure, so the arithmetic is tested without a database. */
export function summarizeKpis(raw: KpiRaw): KpiView {
  const decided = Object.values(raw.byDecision).reduce((a, b) => a + b, 0);
  return {
    ...raw,
    decided,
    autoSharePct:
      decided === 0
        ? null
        : Math.round((raw.byDecision.AUTO_EXECUTE / decided) * 100),
  };
}
