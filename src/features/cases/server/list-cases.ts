import { and, count, desc, eq, type SQL } from "drizzle-orm";
import type { Db } from "@/db/client";
import { cases } from "@/db/schema/app";
import type { CasesQuery } from "../schemas/list-query";

export type CaseListRow = Pick<
  typeof cases.$inferSelect,
  | "id"
  | "receivedAt"
  | "fromEmail"
  | "subject"
  | "intent"
  | "decision"
  | "status"
  | "handlingMs"
>;

export type CaseListPage = {
  rows: CaseListRow[];
  total: number;
  page: number;
  pageCount: number;
};

/** One page of cases, newest first. The page is clamped to the last page that exists. */
export async function listCases(
  db: Db,
  query: CasesQuery,
  pageSize: number,
): Promise<CaseListPage> {
  const filters: SQL[] = [];
  if (query.status) filters.push(eq(cases.status, query.status));
  if (query.decision) filters.push(eq(cases.decision, query.decision));
  const where = filters.length ? and(...filters) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(cases)
    .where(where);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(query.page, pageCount);

  const rows = await db
    .select({
      id: cases.id,
      receivedAt: cases.receivedAt,
      fromEmail: cases.fromEmail,
      subject: cases.subject,
      intent: cases.intent,
      decision: cases.decision,
      status: cases.status,
      handlingMs: cases.handlingMs,
    })
    .from(cases)
    .where(where)
    .orderBy(desc(cases.receivedAt), desc(cases.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { rows, total, page, pageCount };
}
