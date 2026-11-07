import type { NormalizedExtraction } from "@/agent/llm/normalize";
import { normalizedExtractionSchema } from "@/agent/pipeline/state";
import type { CaseStatus, EventStatus } from "@/agent/pipeline/types";
import type { Decision, Intent } from "@/agent/rules/types";
import type { replyStatuses } from "@/db/schema/app";
import { STUCK_AFTER_MS } from "@/features/review/server/review-case";
import { isBeingProcessed } from "../status";
import { extractedFields, type ExtractedField } from "./extracted-fields";
import { previewReply, type ReplyPreview } from "./preview-reply";
import { summarizeEvent } from "./summarize-event";

/** Raw rows as loaded by `getCaseDetail`. */
type ReplyStatus = (typeof replyStatuses)[number];

export type CaseDetailRows = {
  case: {
    id: string;
    receivedAt: Date;
    updatedAt: Date;
    fromEmail: string;
    subject: string;
    body: string;
    status: CaseStatus;
    intent: Intent | null;
    decision: Decision | null;
    confidence: string | null;
    extracted: unknown;
    reasonCodes: string[];
    handlingMs: number | null;
  };
  events: {
    id: number;
    seq: number;
    step: string;
    status: EventStatus;
    payload: unknown;
    durationMs: number | null;
  }[];
  screenshots: { id: string; step: string; caption: string }[];
  reply: {
    subject: string;
    body: string;
    status: ReplyStatus;
    editedByHuman: boolean;
  } | null;
  review: {
    decision: "approve" | "reject";
    note: string | null;
    reviewerLabel: string;
    at: Date;
  } | null;
};

type TimelineEntry = {
  id: number;
  step: string;
  status: EventStatus;
  durationMs: number | null;
  summary: string | null;
  errorCode: string | null;
};

export type CaseView = {
  id: string;
  receivedAt: Date;
  fromEmail: string;
  subject: string;
  body: string;
  status: CaseStatus;
  decision: Decision | null;
  /** 0–100, or null before the analysis. */
  confidencePct: number | null;
  reasonCodes: string[];
  handlingMs: number | null;
  fields: ExtractedField[];
  timeline: TimelineEntry[];
  screenshots: CaseDetailRows["screenshots"];
  reply: CaseDetailRows["reply"];
  review: CaseDetailRows["review"];
  /** Only while the case waits at the review gate. */
  replyPreview: ReplyPreview | null;
  /** The case failed, or no progress for longer than the stuck window. */
  canResume: boolean;
  /** The page should keep refreshing. */
  inFlight: boolean;
};

function parseExtraction(raw: unknown): NormalizedExtraction | null {
  const parsed = normalizedExtractionSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

const WAITING_OR_FINISHED: readonly CaseStatus[] = [
  "DONE",
  "REPLY_READY",
  "AWAITING_REVIEW",
];

/** Same rule as `resumeCase`, so the button is only offered when the API would accept it. */
export function canResumeCase(
  status: CaseStatus,
  updatedAt: Date,
  now: Date,
): boolean {
  if (status === "FAILED") return true;
  if (WAITING_OR_FINISHED.includes(status)) return false;
  return now.getTime() - updatedAt.getTime() >= STUCK_AFTER_MS;
}

/** Pure mapping from rows to what the page shows. Unreadable stored JSON is left out. */
export function buildCaseView(rows: CaseDetailRows, now: Date): CaseView {
  const c = rows.case;
  const extraction = parseExtraction(c.extracted);
  const confidence = c.confidence === null ? null : Number(c.confidence);

  return {
    id: c.id,
    receivedAt: c.receivedAt,
    fromEmail: c.fromEmail,
    subject: c.subject,
    body: c.body,
    status: c.status,
    decision: c.decision,
    confidencePct:
      confidence !== null && Number.isFinite(confidence)
        ? Math.round(confidence * 100)
        : null,
    reasonCodes: c.reasonCodes,
    handlingMs: c.handlingMs,
    fields: extraction ? extractedFields(extraction) : [],
    timeline: [...rows.events]
      .sort((a, b) => a.seq - b.seq)
      .map((e) => {
        const summary = summarizeEvent(e.step, e.status, e.payload);
        return {
          id: e.id,
          step: e.step,
          status: e.status,
          durationMs: e.durationMs,
          summary: summary.text,
          errorCode: summary.errorCode,
        };
      }),
    screenshots: rows.screenshots,
    reply: rows.reply,
    review: rows.review,
    replyPreview:
      c.status === "AWAITING_REVIEW" ? previewReply(rows.events) : null,
    canResume: canResumeCase(c.status, c.updatedAt, now),
    inFlight: isBeingProcessed(
      { status: c.status, decision: c.decision, updatedAt: c.updatedAt },
      now,
    ),
  };
}
