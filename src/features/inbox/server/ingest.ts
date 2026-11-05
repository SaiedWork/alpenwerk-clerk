import { getDb, type Db } from "@/db/client";
import { cases } from "@/db/schema/app";
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
  const [row] = await db
    .insert(cases)
    .values({
      fromEmail: email.from,
      subject: email.subject,
      body: email.body,
      source,
    })
    .returning({ id: cases.id });

  caseLogger(row.id).info(
    {
      source,
      subjectChars: email.subject.length,
      bodyChars: email.body.length,
    },
    "case received",
  );
  return { caseId: row.id };
}
