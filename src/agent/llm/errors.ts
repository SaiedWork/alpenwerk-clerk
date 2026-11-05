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
