import { eq } from "drizzle-orm";
import { appendAudit } from "@/db/audit";
import { cases, replies } from "@/db/schema/app";
import { withTransaction } from "@/db/tx";
import type { ReplyStore } from "./reply-store";

/** Drizzle implementation. Rows are locked (`FOR UPDATE`) so two concurrent calls cannot both win. */
export function createDbReplyStore(): ReplyStore {
  return {
    async edit(input) {
      return withTransaction(async (tx) => {
        const [reply] = await tx
          .select({ status: replies.status })
          .from(replies)
          .where(eq(replies.caseId, input.caseId))
          .for("update");
        if (!reply) return "no_reply";
        if (reply.status !== "draft") return "not_draft";
        await tx
          .update(replies)
          .set({
            subject: input.subject,
            body: input.body,
            editedByHuman: true,
          })
          .where(eq(replies.caseId, input.caseId));
        await appendAudit(tx, {
          caseId: input.caseId,
          actor: "human",
          action: "reply.edited",
          details: { reviewerLabel: input.reviewerLabel },
        });
        return "ok";
      });
    },

    async send(input) {
      return withTransaction(async (tx) => {
        const [c] = await tx
          .select({ status: cases.status })
          .from(cases)
          .where(eq(cases.id, input.caseId))
          .for("update");
        if (!c) return "case_not_found";
        if (c.status !== "REPLY_READY") return "not_ready";
        const [reply] = await tx
          .select({ status: replies.status })
          .from(replies)
          .where(eq(replies.caseId, input.caseId))
          .for("update");
        if (!reply) return "no_reply";
        if (reply.status !== "draft") return "not_draft";
        await tx
          .update(replies)
          .set({ status: "simulated_sent" })
          .where(eq(replies.caseId, input.caseId));
        await tx
          .update(cases)
          .set({ status: "DONE", updatedAt: new Date() })
          .where(eq(cases.id, input.caseId));
        await appendAudit(tx, {
          caseId: input.caseId,
          actor: "human",
          action: "reply.sent_simulated",
          details: { reviewerLabel: input.reviewerLabel },
        });
        return "ok";
      });
    },
  };
}
