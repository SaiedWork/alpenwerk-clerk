export type EditResult = "ok" | "no_reply" | "not_draft";
export type SendResult =
  "ok" | "case_not_found" | "not_ready" | "no_reply" | "not_draft";

/** Persistence port of the reply actions. The Drizzle version is in `db-reply-store.ts`. */
export interface ReplyStore {
  /** Replaces a draft's text and marks it human-edited; writes the audit row atomically. */
  edit(input: {
    caseId: string;
    subject: string;
    body: string;
    reviewerLabel: string;
  }): Promise<EditResult>;

  /**
   * Marks the draft `simulated_sent` and the case `DONE`, with its audit row, in one
   * transaction. Only one caller can win.
   */
  send(input: { caseId: string; reviewerLabel: string }): Promise<SendResult>;
}
