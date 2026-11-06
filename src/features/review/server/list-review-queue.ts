import { asc, count, inArray } from "drizzle-orm";
import type { CaseStatus } from "@/agent/pipeline/types";
import type { Db } from "@/db/client";
import { cases } from "@/db/schema/app";

/** A case needs a human in exactly these two states. */
export const REVIEW_QUEUE_STATUSES = [
  "AWAITING_REVIEW",
  "REPLY_READY",
] as const satisfies readonly CaseStatus[];

export type ReviewTask = "review" | "send";

/** What the human has to do: decide on a case, or check and send its reply draft. */
export function reviewTask(status: CaseStatus): ReviewTask {
  return status === "AWAITING_REVIEW" ? "review" : "send";
}

export type ReviewQueueRow = Pick<
  typeof cases.$inferSelect,
  | "id"
  | "receivedAt"
  | "updatedAt"
  | "fromEmail"
  | "subject"
  | "intent"
  | "status"
  | "reasonCodes"
>;

/** Cases waiting for a human, longest waiting first. */
export async function listReviewQueue(db: Db): Promise<ReviewQueueRow[]> {
  return db
    .select({
      id: cases.id,
      receivedAt: cases.receivedAt,
      updatedAt: cases.updatedAt,
      fromEmail: cases.fromEmail,
      subject: cases.subject,
      intent: cases.intent,
      status: cases.status,
      reasonCodes: cases.reasonCodes,
    })
    .from(cases)
    .where(inArray(cases.status, [...REVIEW_QUEUE_STATUSES]))
    .orderBy(asc(cases.updatedAt), asc(cases.id))
    .limit(100);
}

export async function countReviewQueue(db: Db): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(cases)
    .where(inArray(cases.status, [...REVIEW_QUEUE_STATUSES]));
  return row?.total ?? 0;
}
