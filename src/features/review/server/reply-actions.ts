import { caseLogger } from "@/lib/logger";
import { replyEditSchema, replySendSchema } from "../schemas/reply";
import { ReviewError } from "./errors";
import type { ReplyStore } from "./reply-store";

// The `approved` and `rejected` values of `reply_status` are unused on purpose: the whole
// human flow is draft -> (edited) -> simulated_sent. The review decision lives in `reviews`.

/** Edits a reply draft. Refused once the reply is sent. Text is never logged or audited. */
export async function editReply(
  input: unknown,
  store: ReplyStore,
): Promise<void> {
  const parsed = replyEditSchema.parse(input);
  const result = await store.edit(parsed);
  if (result === "no_reply") {
    throw new ReviewError("REPLY_NOT_FOUND", "case has no reply");
  }
  if (result === "not_draft") {
    throw new ReviewError("REPLY_NOT_DRAFT", "reply is already sent");
  }
  caseLogger(parsed.caseId).info("reply edited");
}

/** "Sends" the reply (simulated) and finishes the case. Exactly once per reply. */
export async function sendReply(
  input: unknown,
  store: ReplyStore,
): Promise<void> {
  const parsed = replySendSchema.parse(input);
  const result = await store.send(parsed);
  if (result === "case_not_found") {
    throw new ReviewError("CASE_NOT_FOUND", "case does not exist");
  }
  if (result === "not_ready") {
    throw new ReviewError("CASE_NOT_REPLY_READY", "case has no reply to send");
  }
  if (result === "no_reply") {
    throw new ReviewError("REPLY_NOT_FOUND", "case has no reply");
  }
  if (result === "not_draft") {
    throw new ReviewError("REPLY_NOT_DRAFT", "reply is already sent");
  }
  caseLogger(parsed.caseId).info("reply sent (simulated)");
}
