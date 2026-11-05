export const MAX_SUBJECT_CHARS = 200;
export const MAX_BODY_CHARS = 4000;

/** Input rejected before any LLM call. */
export class LlmInputError extends Error {
  readonly code = "INPUT_TOO_LONG";
  constructor(message: string) {
    super(message);
    this.name = "LlmInputError";
  }
}

export function assertWithinLimits(subject: string, body: string): void {
  if (subject.length > MAX_SUBJECT_CHARS) {
    throw new LlmInputError(`Subject exceeds ${MAX_SUBJECT_CHARS} characters`);
  }
  if (body.length > MAX_BODY_CHARS) {
    throw new LlmInputError(`Body exceeds ${MAX_BODY_CHARS} characters`);
  }
}
