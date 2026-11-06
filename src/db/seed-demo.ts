import { buildDemoCases } from "../../seed/demo-cases";
import { applyAddressChange, applyBankChange } from "@/legacy/mutations";
import { auditEntrySchema } from "./audit";
import { auditLog, caseEvents, cases, replies, reviews } from "./schema/app";
import type { Tx } from "./tx";

export interface DemoSummary {
  demoCases: number;
  demoLegacyChanges: number;
}

/**
 * Inserts the preloaded demo cases. Expects empty app tables and the seeded legacy data (see
 * `resetDatabase`). Cases the clerk "executed" also get their edit in the legacy system, through
 * the legacy system's own mutation code, so the record and the case history agree.
 */
export async function seedDemoCases(tx: Tx, now: Date): Promise<DemoSummary> {
  const demo = buildDemoCases(now);
  let legacyChanges = 0;

  for (const c of demo) {
    await tx.insert(cases).values({
      id: c.id,
      receivedAt: c.receivedAt,
      createdAt: c.receivedAt,
      updatedAt: c.updatedAt,
      fromEmail: c.fromEmail,
      subject: c.subject,
      body: c.body,
      source: "seed",
      status: c.status,
      intent: c.extraction.primaryIntent,
      confidence: c.extraction.confidence.toFixed(3),
      extracted: c.extraction,
      policyNo: c.extraction.policyNo,
      decision: c.decision,
      reasonCodes: c.reasonCodes,
      handlingMs: c.handlingMs,
    });
    await tx
      .insert(caseEvents)
      .values(c.events.map((e) => ({ caseId: c.id, ...e })));
    if (c.reply) await tx.insert(replies).values({ caseId: c.id, ...c.reply });
    if (c.review)
      await tx.insert(reviews).values({ caseId: c.id, ...c.review });
    // Validated like every other audit row: only the allowed keys, never email text.
    await tx.insert(auditLog).values(
      c.audit.map((a) => ({
        ...auditEntrySchema.parse({
          caseId: c.id,
          actor: a.actor,
          action: a.action,
          details: a.details,
        }),
        at: a.at,
      })),
    );

    const change = c.legacyChange;
    if (change) {
      const result =
        change.kind === "bank"
          ? await applyBankChange(tx, change.policyNo, change.input)
          : await applyAddressChange(tx, change.policyNo, change.input);
      if (result.outcome !== "changed") {
        throw new Error(
          `demo case ${c.id}: legacy change was "${result.outcome}", expected "changed"`,
        );
      }
      legacyChanges += 1;
    }
  }
  return { demoCases: demo.length, demoLegacyChanges: legacyChanges };
}
