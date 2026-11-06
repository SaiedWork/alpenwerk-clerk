import { after } from "next/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { runCase } from "@/features/inbox/server/run-case";
import { ReviewError } from "@/features/review/server/errors";
import { createDbReviewStore } from "@/features/review/server/db-review-store";
import { resumeCase } from "@/features/review/server/review-case";

// Execute and verify drive a browser; keep within the plan's function limit.
export const maxDuration = 60;

const STATUS_BY_CODE = {
  CASE_NOT_FOUND: 404,
  CASE_NOT_AWAITING_REVIEW: 409,
  CASE_AWAITING_REVIEW: 409,
  CASE_FINISHED: 409,
  CASE_NOT_STUCK: 409,
  CASE_NOT_REPLY_READY: 409,
  REPLY_NOT_FOUND: 404,
  REPLY_NOT_DRAFT: 409,
} as const;

/** Resumes a stuck or failed case. Idempotent: finished steps are never repeated. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    return Response.json({ error: "INVALID_ID" }, { status: 400 });
  }
  try {
    await resumeCase(id, {
      store: createDbReviewStore(getDb()),
      schedule: (caseId) => after(() => runCase(caseId)),
    });
    return Response.json({ caseId: id }, { status: 202 });
  } catch (error) {
    if (error instanceof ReviewError) {
      return Response.json(
        { error: error.code },
        { status: STATUS_BY_CODE[error.code] },
      );
    }
    throw error;
  }
}
