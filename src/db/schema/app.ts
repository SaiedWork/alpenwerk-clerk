import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Schema `app`: everything the digital clerk owns (cases, pipeline events, audit, ...).
 * The mock legacy system lives in its own schema, see `legacy.ts`.
 */
export const appSchema = pgSchema("app");

// Value lists are exported so Zod schemas and UI code can reuse them.
export const caseSources = ["simulator", "webhook", "seed"] as const;
export const caseStatuses = [
  "RECEIVED",
  "ANALYZED",
  "IDENTIFIED",
  "EVALUATED",
  "AWAITING_REVIEW",
  "EXECUTING",
  "VERIFIED",
  "REPLY_READY",
  "DONE",
  "FAILED",
  "REJECTED",
] as const;
export const intents = [
  "address_change",
  "bank_change",
  "termination",
  "other",
] as const;
export const decisions = [
  "AUTO_EXECUTE",
  "NEEDS_REVIEW",
  "REPLY_ONLY",
] as const;
export const eventStatuses = [
  "started",
  "succeeded",
  "failed",
  "skipped",
] as const;
export const auditActors = ["agent", "human", "system"] as const;
export const replyStatuses = [
  "draft",
  "approved",
  "simulated_sent",
  "rejected",
] as const;
export const reviewDecisions = ["approve", "reject"] as const;

export const caseSourceEnum = appSchema.enum("case_source", caseSources);
export const caseStatusEnum = appSchema.enum("case_status", caseStatuses);
export const intentEnum = appSchema.enum("intent", intents);
export const decisionEnum = appSchema.enum("decision", decisions);
export const eventStatusEnum = appSchema.enum("event_status", eventStatuses);
export const auditActorEnum = appSchema.enum("audit_actor", auditActors);
export const replyStatusEnum = appSchema.enum("reply_status", replyStatuses);
export const reviewDecisionEnum = appSchema.enum(
  "review_decision",
  reviewDecisions,
);

/** Postgres `bytea`, used for screenshots. Drizzle has no built-in type for it. */
const bytea = customType<{ data: Buffer; driverData: Buffer | string }>({
  dataType: () => "bytea",
  // The HTTP driver sends parameters as text, so bytes go in as a hex literal.
  toDriver: (value) => `\\x${value.toString("hex")}`,
  fromDriver: (value) =>
    typeof value === "string"
      ? Buffer.from(value.replace(/^\\x/, ""), "hex")
      : value,
});

const timestamptz = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });

export const cases = appSchema.table(
  "cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    receivedAt: timestamptz("received_at").notNull().defaultNow(),
    fromEmail: text("from_email").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    source: caseSourceEnum("source").notNull(),
    status: caseStatusEnum("status").notNull().default("RECEIVED"),
    intent: intentEnum("intent"),
    confidence: numeric("confidence", { precision: 4, scale: 3 }),
    extracted: jsonb("extracted"),
    policyNo: text("policy_no"),
    decision: decisionEnum("decision"),
    reasonCodes: text("reason_codes")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    handlingMs: integer("handling_ms"),
    error: jsonb("error"),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("cases_status_idx").on(t.status),
    index("cases_received_at_idx").on(t.receivedAt),
  ],
);

/** Pipeline timeline: one row per step attempt, ordered by `seq` within a case. */
export const caseEvents = appSchema.table(
  "case_events",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    step: text("step").notNull(),
    status: eventStatusEnum("status").notNull(),
    payload: jsonb("payload"),
    startedAt: timestamptz("started_at").notNull().defaultNow(),
    durationMs: integer("duration_ms"),
  },
  (t) => [uniqueIndex("case_events_case_seq_idx").on(t.caseId, t.seq)],
);

/**
 * Append-only audit trail. The trigger that rejects UPDATE/DELETE is added with the
 * audit task; `case_id` is nullable for system-level actions such as the daily reset.
 */
export const auditLog = appSchema.table(
  "audit_log",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    caseId: uuid("case_id").references(() => cases.id),
    actor: auditActorEnum("actor").notNull(),
    action: text("action").notNull(),
    details: jsonb("details"),
    at: timestamptz("at").notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_case_idx").on(t.caseId),
    index("audit_log_at_idx").on(t.at),
  ],
);

export const screenshots = appSchema.table(
  "screenshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    step: text("step").notNull(),
    caption: text("caption").notNull(),
    mime: text("mime").notNull().default("image/jpeg"),
    data: bytea("data").notNull(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (t) => [index("screenshots_case_idx").on(t.caseId)],
);

export const replies = appSchema.table(
  "replies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    templateKey: text("template_key").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    status: replyStatusEnum("status").notNull().default("draft"),
    editedByHuman: boolean("edited_by_human").notNull().default(false),
  },
  (t) => [index("replies_case_idx").on(t.caseId)],
);

export const reviews = appSchema.table(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    decision: reviewDecisionEnum("decision").notNull(),
    note: text("note"),
    reviewerLabel: text("reviewer_label").notNull(),
    at: timestamptz("at").notNull().defaultNow(),
  },
  (t) => [index("reviews_case_idx").on(t.caseId)],
);

/** Cached LLM responses. `key` hashes prompt version + schema version + normalized email text. */
export const llmCache = appSchema.table("llm_cache", {
  key: text("key").primaryKey(),
  response: jsonb("response").notNull(),
  model: text("model").notNull(),
  seeded: boolean("seeded").notNull().default(false),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});

/** One row per LLM call (cached or live); feeds the daily budget guard and cost reporting. */
export const llmCalls = appSchema.table(
  "llm_calls",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    caseId: uuid("case_id").references(() => cases.id, {
      onDelete: "set null",
    }),
    model: text("model").notNull(),
    tokensIn: integer("tokens_in").notNull().default(0),
    tokensOut: integer("tokens_out").notNull().default(0),
    cached: boolean("cached").notNull(),
    estCostUsd: numeric("est_cost_usd", { precision: 10, scale: 6 })
      .notNull()
      .default("0"),
    at: timestamptz("at").notNull().defaultNow(),
  },
  (t) => [index("llm_calls_at_idx").on(t.at)],
);

/** Fixed-window rate limiting. `key` is a hashed IP plus an action name, never a raw IP. */
export const rateLimits = appSchema.table(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamptz("window_start").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);
