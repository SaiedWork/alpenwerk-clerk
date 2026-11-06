export const reviewErrorCodes = [
  "CASE_NOT_FOUND",
  "CASE_NOT_AWAITING_REVIEW",
  "CASE_AWAITING_REVIEW",
  "CASE_FINISHED",
  "CASE_NOT_STUCK",
  "CASE_NOT_REPLY_READY",
  "REPLY_NOT_FOUND",
  "REPLY_NOT_DRAFT",
] as const;

/** Typed error for the review actions; `code` is stable, the message is for logs only. */
export class ReviewError extends Error {
  constructor(
    readonly code: (typeof reviewErrorCodes)[number],
    message: string,
  ) {
    super(message);
    this.name = "ReviewError";
  }
}
