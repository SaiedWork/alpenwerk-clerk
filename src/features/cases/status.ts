import type { Decision } from "@/agent/rules/types";
import type { CaseStatus } from "@/agent/pipeline/types";

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
