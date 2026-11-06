import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db/client";
import {
  caseEvents,
  cases,
  replies,
  reviews,
  screenshots,
} from "@/db/schema/app";
import { buildCaseView, type CaseView } from "../view/case-view";

/**
 * Loads everything the detail page shows. A malformed or unknown id gives `null`.
 * Screenshot bytes are not loaded: the page links to `/api/screenshots/[id]`.
 */
export async function getCaseDetail(
  db: Db,
  id: string,
  now: Date = new Date(),
): Promise<CaseView | null> {
  if (!z.uuid().safeParse(id).success) return null;

  const [caseRow] = await db.select().from(cases).where(eq(cases.id, id));
  if (!caseRow) return null;

  const [events, shots, [reply], [review]] = await Promise.all([
    db
      .select()
      .from(caseEvents)
      .where(eq(caseEvents.caseId, id))
      .orderBy(asc(caseEvents.seq)),
    db
      .select({
        id: screenshots.id,
        step: screenshots.step,
        caption: screenshots.caption,
      })
      .from(screenshots)
      .where(eq(screenshots.caseId, id))
      .orderBy(asc(screenshots.createdAt), asc(screenshots.id)),
    db.select().from(replies).where(eq(replies.caseId, id)).limit(1),
    db
      .select()
      .from(reviews)
      .where(eq(reviews.caseId, id))
      .orderBy(asc(reviews.at))
      .limit(1),
  ]);

  return buildCaseView(
    {
      case: caseRow,
      events,
      screenshots: shots,
      reply: reply ?? null,
      review: review ?? null,
    },
    now,
  );
}
