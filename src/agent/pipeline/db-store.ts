import { and, asc, eq, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { caseEvents, cases, replies } from "@/db/schema/app";
import type { PipelineStore } from "./types";

/** Drizzle implementation of the pipeline's persistence port. */
export function createDbPipelineStore(db: Db): PipelineStore {
  return {
    async getCase(caseId) {
      const [row] = await db
        .select({
          id: cases.id,
          fromEmail: cases.fromEmail,
          subject: cases.subject,
          body: cases.body,
        })
        .from(cases)
        .where(eq(cases.id, caseId))
        .limit(1);
      return row ?? null;
    },

    async listEvents(caseId) {
      return db
        .select({
          id: caseEvents.id,
          seq: caseEvents.seq,
          step: caseEvents.step,
          status: caseEvents.status,
          payload: caseEvents.payload,
          durationMs: caseEvents.durationMs,
        })
        .from(caseEvents)
        .where(eq(caseEvents.caseId, caseId))
        .orderBy(asc(caseEvents.seq));
    },

    async startEvent(caseId, step) {
      // The unique (case_id, seq) index turns a concurrent second run into an error.
      const [row] = await db
        .insert(caseEvents)
        .values({
          caseId,
          step,
          status: "started",
          seq: sql`(select coalesce(max(${caseEvents.seq}), 0) + 1 from ${caseEvents} where ${caseEvents.caseId} = ${caseId})`,
        })
        .returning({ eventId: caseEvents.id });
      return row;
    },

    async finishEvent(eventId, result) {
      await db
        .update(caseEvents)
        .set({
          status: result.status,
          payload: result.payload,
          durationMs: result.durationMs,
        })
        .where(eq(caseEvents.id, eventId));
    },

    async updateCase(caseId, patch) {
      const { confidence, ...rest } = patch;
      await db
        .update(cases)
        .set({
          ...rest,
          // numeric(4,3) column: drizzle expects a string.
          ...(confidence === undefined
            ? {}
            : { confidence: confidence.toFixed(3) }),
          updatedAt: new Date(),
        })
        .where(eq(cases.id, caseId));
    },

    async saveReply(caseId, reply, { sent }) {
      const status = sent ? "simulated_sent" : "draft";
      await db
        .insert(replies)
        .values({ caseId, ...reply, status })
        .onConflictDoUpdate({
          target: replies.caseId,
          set: { ...reply, status },
          // Only an untouched draft is replaced: never an edited reply, never a sent one.
          setWhere: and(
            eq(replies.editedByHuman, false),
            eq(replies.status, "draft"),
          ),
        });
    },
  };
}
