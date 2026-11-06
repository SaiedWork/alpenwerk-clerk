import type { Decision } from "@/agent/rules/types";
import type { CaseStatus } from "@/agent/pipeline/types";
import { STUCK_AFTER_MS } from "@/features/review/server/review-case";

/**
 * True while the pipeline is still working on a case, so the list should keep refreshing.
 * Cases waiting for a human (`AWAITING_REVIEW`, a reviewed case at `REPLY_READY`) and
 * finished ones do not count. A `REPLY_READY` case without a review is only transitional:
 * its reply is sent automatically and the case ends `DONE`.
 */
export function isInFlight(c: {
  status: CaseStatus;
  decision: Decision | null;
}): boolean {
  switch (c.status) {
    case "AWAITING_REVIEW":
    case "DONE":
    case "FAILED":
      return false;
    case "REPLY_READY":
      return c.decision !== "NEEDS_REVIEW";
    default:
      return true;
  }
}

/**
 * True while a case is really being worked on: in flight and updated within the stuck window.
 * A case that stopped halfway keeps an in-flight status forever, but nothing is running for it
 * any more (the page offers "resume" instead), so a page must not poll on its account.
 */
export function isBeingProcessed(
  c: { status: CaseStatus; decision: Decision | null; updatedAt: Date },
  now: Date,
): boolean {
  return (
    isInFlight(c) && now.getTime() - c.updatedAt.getTime() < STUCK_AFTER_MS
  );
}
