import { z } from "zod";
import type { Db } from "./client";
import { auditActors, auditLog } from "./schema/app";
import type { Tx } from "./tx";

/**
 * Allowed keys of `audit_log.details`. Strict on purpose: free-form keys are how email text or a
 * full IBAN would end up in an append-only table that can never be corrected.
 */
const auditDetailsSchema = z.strictObject({
  source: z.string().max(40).optional(),
  step: z.string().max(40).optional(),
  status: z.string().max(40).optional(),
  durationMs: z.number().int().nonnegative().optional(),
  decision: z.string().max(40).optional(),
  reasonCodes: z.array(z.string().max(60)).max(30).optional(),
  code: z.string().max(80).optional(),
  reviewerLabel: z.string().max(60).optional(),
  hasNote: z.boolean().optional(),
});

export const auditEntrySchema = z.strictObject({
  caseId: z.uuid().nullable(),
  actor: z.enum(auditActors),
  action: z.string().min(1).max(80),
  details: auditDetailsSchema.default({}),
});

export type AuditEntry = z.input<typeof auditEntrySchema>;

/** Where audit rows are written; the pipeline depends on this, not on the database. */
export interface AuditSink {
  append(entry: AuditEntry): Promise<void>;
}

/** Inserts one audit row. Pass a transaction to make it atomic with the action it records. */
export async function appendAudit(
  executor: Db | Tx,
  entry: AuditEntry,
): Promise<void> {
  const parsed = auditEntrySchema.parse(entry);
  await executor.insert(auditLog).values(parsed);
}

export function createDbAuditSink(db: Db): AuditSink {
  return { append: (entry) => appendAudit(db, entry) };
}
