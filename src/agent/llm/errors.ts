import { t } from "@/lib/i18n-de";
import { LlmInputError } from "./limits";

/** Failures of the live extraction call. Each has a stable `code` stored on the event row. */
export type LlmErrorCode =
  | "LLM_NOT_CONFIGURED"
  | "LLM_TIMEOUT"
  | "LLM_PROVIDER_ERROR"
  | "LLM_OUTPUT_INVALID";

export class LlmError extends Error {
  constructor(
    readonly code: LlmErrorCode,
    message: string,
    options?: { cause?: unknown; details?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = "LlmError";
    this.details = options?.details;
  }
  /** Extra diagnostics, e.g. Zod issues. Never contains the email text. */
  readonly details: unknown;
}

/** Replay mode: the email is not in the cache and live calls are off. Thrown by the resolver (Task 20). */
export class ReplayMissError extends Error {
  readonly code = "REPLAY_MISS";
  constructor() {
    super("No cached extraction for this email and LLM_PROVIDER=replay");
    this.name = "ReplayMissError";
  }
}

/** Daily circuit breaker for live calls is open: only cached emails run until tomorrow (Berlin). */
export class LlmBudgetError extends Error {
  readonly code = "DAILY_CAP_REACHED";
  constructor(readonly cap: number) {
    super(`Daily live LLM call cap of ${cap} reached`);
    this.name = "LlmBudgetError";
  }
}

/** German message for the UI, or `null` for errors that are not part of the LLM step. */
export function llmFailureMessageDe(error: unknown): string | null {
  if (error instanceof LlmBudgetError) return t.llm.dailyCapReached;
  if (error instanceof ReplayMissError) return t.llm.replayMiss;
  if (error instanceof LlmInputError) return t.llm.inputTooLong;
  if (error instanceof LlmError) return t.llm.failed;
  return null;
}
