import type { LegacyReadback, LegacyWriter } from "@/agent/executor/driver";
import type { LegacySnapshotReader } from "@/agent/executor/snapshot-reader";
import type { NormalizedExtraction } from "@/agent/llm/normalize";
import type { ResolveDeps } from "@/agent/llm/resolve";
import type { NormalizedParams } from "@/agent/rules/engine";
import type { Decision, LegacySnapshot } from "@/agent/rules/types";
import type { AuditSink } from "@/db/audit";
import type { caseStatuses, eventStatuses } from "@/db/schema/app";

export type CaseStatus = (typeof caseStatuses)[number];
export type EventStatus = (typeof eventStatuses)[number];

export const STEP_NAMES = [
  "analyze",
  "identify",
  "evaluate",
  "execute",
  "verify",
  "reply",
] as const;
export type StepName = (typeof STEP_NAMES)[number];

/** The case fields the pipeline reads. */
export interface PipelineCase {
  id: string;
  fromEmail: string;
  subject: string;
  body: string;
}

/** One row of the timeline. */
export interface StoredEvent {
  id: number;
  seq: number;
  step: string;
  status: EventStatus;
  payload: unknown;
  durationMs: number | null;
}

/** Case columns a step may write. */
export interface CasePatch {
  status?: CaseStatus;
  intent?: NormalizedExtraction["primaryIntent"];
  confidence?: number;
  extracted?: unknown;
  policyNo?: string | null;
  decision?: Decision;
  reasonCodes?: string[];
  handlingMs?: number;
  error?: { code: string; messageDe: string; step: string } | null;
}

/** Persistence port. The Drizzle implementation is thin; all logic stays in the runner. */
export interface PipelineStore {
  getCase(caseId: string): Promise<PipelineCase | null>;
  listEvents(caseId: string): Promise<StoredEvent[]>;
  /** Inserts a `started` row with the next `seq`. */
  startEvent(caseId: string, step: StepName): Promise<{ eventId: number }>;
  finishEvent(
    eventId: number,
    result: { status: EventStatus; payload: unknown; durationMs: number },
  ): Promise<void>;
  updateCase(caseId: string, patch: CasePatch): Promise<void>;
  /**
   * Stores the reply draft; one reply per case. A re-run replaces the draft, but never a reply
   * a human has edited.
   */
  saveReply(caseId: string, reply: ReplyDraft): Promise<void>;
}

export interface ReplyDraft {
  templateKey: string;
  subject: string;
  body: string;
}

export interface PipelineDeps {
  store: PipelineStore;
  reader: LegacySnapshotReader;
  /** Absent when no browser is configured; the execute step then ends `skipped`. */
  writer?: LegacyWriter;
  /** Reads the record back for the verify step; set together with `writer`. */
  readback?: LegacyReadback;
  /**
   * A human approved this case. Lets a `NEEDS_REVIEW` case continue to execute; the review
   * gate sets it. Never set for automatic runs.
   */
  approved?: boolean;
  /** A human rejected this case: execute and verify are skipped and the reply says so. */
  rejected?: boolean;
  /** Receives one audit row per finished or failed step. Optional: tests and tools may omit it. */
  audit?: AuditSink;
  /** Lazy so a missing API key becomes a recorded step failure, not a crash. */
  llm: () => ResolveDeps;
  now?: () => Date;
}

/** What earlier steps produced; rebuilt from the stored event payloads on every run. */
export interface PipelineState {
  extraction?: NormalizedExtraction;
  /** `undefined`: identify has not run. `null`: it ran and the policy was not found. */
  snapshot?: LegacySnapshot | null;
  /** `undefined`: execute has not run. `false`: it ended `skipped`. */
  executed?: boolean;
  evaluation?: {
    decision: Decision;
    reasonCodes: string[];
    normalizedParams: NormalizedParams | null;
  };
}

export interface StepContext {
  case: PipelineCase;
  state: PipelineState;
  deps: PipelineDeps;
  now: Date;
}

/** `skipped` means "nothing to do, and that is fine"; it counts as done. */
export interface StepResult {
  status: "succeeded" | "skipped";
  /** Stored on the event row; later steps read their inputs from it. */
  payload: unknown;
  casePatch: CasePatch;
}

export type Step = (ctx: StepContext) => Promise<StepResult>;
