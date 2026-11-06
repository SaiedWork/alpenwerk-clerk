import { and, count, desc, eq, like, type SQL } from "drizzle-orm";
import type { Db } from "@/db/client";
import { auditLog, cases } from "@/db/schema/app";
import type { AuditQuery } from "../schemas/audit-query";

export type AuditRow = {
  id: number;
  at: Date;
  actor: (typeof auditLog.$inferSelect)["actor"];
  action: string;
  details: unknown;
  caseId: string | null;
  /** Subject of the case, for a readable link. Null for system entries without a case. */
  caseSubject: string | null;
};

export type AuditPage = {
  rows: AuditRow[];
  total: number;
  page: number;
  pageCount: number;
};

/** One page of audit entries, newest first. The page is clamped to the last that exists. */
export async function listAudit(
  db: Db,
  query: AuditQuery,
  pageSize: number,
): Promise<AuditPage> {
  const filters: SQL[] = [];
  if (query.actor) filters.push(eq(auditLog.actor, query.actor));
  if (query.caseId) filters.push(eq(auditLog.caseId, query.caseId));
  // `kind` is a closed enum, so the pattern contains no user-controlled wildcard.
  if (query.kind) filters.push(like(auditLog.action, `${query.kind}.%`));
  const where = filters.length ? and(...filters) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(auditLog)
    .where(where);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(query.page, pageCount);

  const rows = await db
    .select({
      id: auditLog.id,
      at: auditLog.at,
      actor: auditLog.actor,
      action: auditLog.action,
      details: auditLog.details,
      caseId: auditLog.caseId,
      caseSubject: cases.subject,
    })
    .from(auditLog)
    .leftJoin(cases, eq(cases.id, auditLog.caseId))
    .where(where)
    .orderBy(desc(auditLog.at), desc(auditLog.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { rows, total, page, pageCount };
}
