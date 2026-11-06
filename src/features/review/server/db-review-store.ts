import { and, eq } from "drizzle-orm";
import { appendAudit } from "@/db/audit";
import type { Db } from "@/db/client";
import { cases, reviews } from "@/db/schema/app";
import { withTransaction } from "@/db/tx";
import type { ReviewStore } from "./review-store";

/** Drizzle implementation. `decide` needs a real transaction, so it uses the WebSocket driver. */
export function createDbReviewStore(db: Db): ReviewStore {
  return {
    async decide(input) {
      return withTransaction(async (tx) => {
        // The status guard is the lock: the second of two concurrent calls updates no row.
        const claimed = await tx
          .update(cases)
          .set({ status: input.nextStatus, updatedAt: new Date() })
          .where(
            and(
              eq(cases.id, input.caseId),
              eq(cases.status, "AWAITING_REVIEW"),
            ),
          )
          .returning({ id: cases.id });
        if (claimed.length === 0) {
          const [row] = await tx
            .select({ id: cases.id })
            .from(cases)
            .where(eq(cases.id, input.caseId))
            .limit(1);
          return row ? "not_awaiting" : "not_found";
        }
        await tx.insert(reviews).values({
          caseId: input.caseId,
          decision: input.decision,
          note: input.note,
          reviewerLabel: input.reviewerLabel,
        });
        // Same transaction: a review without its audit row cannot exist.
        await appendAudit(tx, {
          caseId: input.caseId,
          actor: "human",
          action: `review.${input.decision === "approve" ? "approved" : "rejected"}`,
          details: {
            reviewerLabel: input.reviewerLabel,
            hasNote: input.note !== null,
          },
        });
        return "ok";
      });
    },

    async getCaseState(caseId) {
      const [row] = await db
        .select({ status: cases.status, updatedAt: cases.updatedAt })
        .from(cases)
        .where(eq(cases.id, caseId))
        .limit(1);
      return row ?? null;
    },

    async hasApproval(caseId) {
      const rows = await db
        .select({ id: reviews.id })
        .from(reviews)
        .where(and(eq(reviews.caseId, caseId), eq(reviews.decision, "approve")))
        .limit(1);
      return rows.length > 0;
    },
  };
}
