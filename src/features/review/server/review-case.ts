import { caseLogger } from "@/lib/logger";
import { reviewInputSchema } from "../schemas/review";
import { ReviewError } from "./errors";
import type { ReviewStore } from "./review-store";

/** A case that has not been touched this long, and is not finished, counts as stuck. */
export const STUCK_AFTER_MS = 90_000;

export interface ReviewDeps {
  store: ReviewStore;
  /** Starts the pipeline after the response is sent. Must not throw. */
  schedule: (caseId: string) => void;
  now?: () => Date;
}

async function decide(
  input: unknown,
  decision: "approve" | "reject",
  deps: ReviewDeps,
): Promise<string> {
  const parsed = reviewInputSchema.parse(input);
  const result = await deps.store.decide({
    caseId: parsed.caseId,
    decision,
    nextStatus: decision === "approve" ? "EXECUTING" : "REJECTED",
    note: parsed.note,
    reviewerLabel: parsed.reviewerLabel,
  });
  if (result === "not_found") {
    throw new ReviewError("CASE_NOT_FOUND", "case does not exist");
  }
  if (result === "not_awaiting") {
    throw new ReviewError(
      "CASE_NOT_AWAITING_REVIEW",
      "case is not awaiting review",
    );
  }
  caseLogger(parsed.caseId).info({ decision }, "review recorded");
  return parsed.caseId;
}

/**
 * Records the approval, then resumes the pipeline. `deps.approved` is derived from the
 * stored review row on every run, so the approval survives a crash and cannot be forged by a caller.
 */
export async function approveCase(
  input: unknown,
  deps: ReviewDeps,
): Promise<void> {
  const caseId = await decide(input, "approve", deps);
  deps.schedule(caseId);
}

/** Records the rejection and ends the case as `REJECTED`. Nothing is executed. */
export async function rejectCase(
  input: unknown,
  deps: ReviewDeps,
): Promise<void> {
  await decide(input, "reject", deps);
}

/**
 * Re-runs a case that stopped halfway (retry after FAILED, or a dead invocation).
 * Refuses finished cases, cases waiting for a human, and cases still within the stuck window
 * (a run may be in progress; concurrent runs are not supported).
 */
export async function resumeCase(
  caseId: string,
  deps: ReviewDeps,
): Promise<void> {
  const now = (deps.now ?? (() => new Date()))();
  const state = await deps.store.getCaseState(caseId);
  if (!state) throw new ReviewError("CASE_NOT_FOUND", "case does not exist");
  if (["DONE", "REJECTED"].includes(state.status)) {
    throw new ReviewError("CASE_FINISHED", "case is finished");
  }
  if (state.status === "AWAITING_REVIEW") {
    throw new ReviewError("CASE_AWAITING_REVIEW", "waiting for a human");
  }
  const idleMs = now.getTime() - state.updatedAt.getTime();
  if (state.status !== "FAILED" && idleMs < STUCK_AFTER_MS) {
    throw new ReviewError("CASE_NOT_STUCK", "case is still being processed");
  }
  deps.schedule(caseId);
}
