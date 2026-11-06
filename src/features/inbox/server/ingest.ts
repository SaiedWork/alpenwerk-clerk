import { getDb, type Db } from "@/db/client";
import { auditEntrySchema } from "@/db/audit";
import { auditLog, cases } from "@/db/schema/app";
import { caseLogger } from "@/lib/logger";
import type { InboundEmail } from "../schemas/inbound";

export type CaseSource = "simulator" | "webhook" | "seed";

/**
 * Creates a case in status `RECEIVED`. Shared by the webhook and (later) the simulator action,
 * so both paths store emails the same way. Input must already be validated and size-limited.
 * Never logs the email text.
 */
export async function ingestEmail(
  email: InboundEmail,
  source: CaseSource,
  db: Db = getDb(),
): Promise<{ caseId: string }> {
  const id = crypto.randomUUID();
  // One batch = one transaction: a case never exists without its `case.received` audit row.
  await db.batch([
    db.insert(cases).values({
      id,
      fromEmail: email.from,
      subject: email.subject,
      body: email.body,
      source,
    }),
    db.insert(auditLog).values(
      auditEntrySchema.parse({
        caseId: id,
        actor: "system",
        action: "case.received",
        details: { source },
      }),
    ),
  ]);

  caseLogger(id).info(
    {
      source,
      subjectChars: email.subject.length,
      bodyChars: email.body.length,
    },
    "case received",
  );
  return { caseId: id };
}
