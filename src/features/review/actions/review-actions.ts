"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getDb } from "@/db/client";
import { runCase } from "@/features/inbox/server/run-case";
import { createDbReplyStore } from "../server/db-reply-store";
import { createDbReviewStore } from "../server/db-review-store";
import { editReply, sendReply } from "../server/reply-actions";
import { approveCase, rejectCase } from "../server/review-case";
import { REVIEWER_LABEL } from "../reviewer";
import { toActionResult, type ActionResult } from "./action-result";

async function run(caseId: string, work: () => Promise<void>) {
  const result = await toActionResult(work);
  // Also on errors: a refused action usually means the page showed an outdated state.
  revalidatePath(`/faelle/${caseId}`);
  revalidatePath("/faelle");
  return result;
}

const schedule = (caseId: string) => after(() => runCase(caseId));

export async function approveCaseAction(
  caseId: string,
  note: string,
): Promise<ActionResult> {
  return run(caseId, () =>
    approveCase(
      { caseId, note, reviewerLabel: REVIEWER_LABEL },
      { store: createDbReviewStore(getDb()), schedule },
    ),
  );
}

export async function rejectCaseAction(
  caseId: string,
  note: string,
): Promise<ActionResult> {
  return run(caseId, () =>
    rejectCase(
      { caseId, note, reviewerLabel: REVIEWER_LABEL },
      { store: createDbReviewStore(getDb()), schedule },
    ),
  );
}

export async function editReplyAction(
  caseId: string,
  subject: string,
  body: string,
): Promise<ActionResult> {
  return run(caseId, () =>
    editReply(
      { caseId, subject, body, reviewerLabel: REVIEWER_LABEL },
      createDbReplyStore(),
    ),
  );
}

export async function sendReplyAction(caseId: string): Promise<ActionResult> {
  return run(caseId, () =>
    sendReply({ caseId, reviewerLabel: REVIEWER_LABEL }, createDbReplyStore()),
  );
}
