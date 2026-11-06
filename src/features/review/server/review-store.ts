import type { CaseStatus } from "@/agent/pipeline/types";

export type DecideResult = "ok" | "not_found" | "not_awaiting";

/** Persistence port of the review gate. The Drizzle version is in `db-review-store.ts`. */
export interface ReviewStore {
  /**
   * Atomically moves an `AWAITING_REVIEW` case to `nextStatus` and writes the `reviews` row.
   * Only one caller can win, so a double submit never writes a second review.
   */
  decide(input: {
    caseId: string;
    decision: "approve" | "reject";
    nextStatus: CaseStatus;
    note: string | null;
    reviewerLabel: string;
  }): Promise<DecideResult>;

  getCaseState(
    caseId: string,
  ): Promise<{ status: CaseStatus; updatedAt: Date } | null>;

  /** Whether a human approved this case. The only source of `deps.approved`. */
  hasApproval(caseId: string): Promise<boolean>;
}
