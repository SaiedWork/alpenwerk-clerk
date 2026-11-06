// Sends an eval-case email to the signed inbound webhook of a running app, then waits for the
// pipeline (through execute) and prints the case, its events and its screenshots.
// Usage: pnpm send-email B01 [--url http://localhost:3000] [--no-wait]
// Needs the dev server running (pnpm dev) and .env.local pointing at the same database.
import { parseArgs } from "node:util";
import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { caseEvents, cases, replies, screenshots } from "@/db/schema/app";
import { env } from "@/lib/env";
import { SIGNATURE_HEADER, signBody, TIMESTAMP_HEADER } from "@/lib/hmac";
import { loadEvalCases } from "../evals/loader";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    url: { type: "string", default: "http://localhost:3000" },
    "no-wait": { type: "boolean", default: false },
  },
});

const [caseId] = positionals;
const evalCases = loadEvalCases();
const evalCase = evalCases.find((c) => c.id === caseId);
if (!evalCase) {
  const ids = evalCases.map((c) => c.id).join(", ");
  throw new Error(`Usage: pnpm send-email <case id>. Known ids: ${ids}`);
}
if (!env.INBOUND_WEBHOOK_SECRET) {
  throw new Error("INBOUND_WEBHOOK_SECRET is not set in .env.local");
}

// Subject and body stay exactly as in the eval case: the replay cache is keyed on them.
const body = JSON.stringify(evalCase.email);
const timestamp = String(Math.floor(Date.now() / 1000));
const response = await fetch(new URL("/api/inbound/email", values.url), {
  method: "POST",
  headers: {
    "content-type": "application/json",
    [SIGNATURE_HEADER]: signBody(env.INBOUND_WEBHOOK_SECRET, timestamp, body),
    [TIMESTAMP_HEADER]: timestamp,
  },
  body,
});
const text = await response.text();
console.log(`${response.status} ${text}`);
if (response.status !== 201 || values["no-wait"])
  process.exit(response.ok ? 0 : 1);

const { caseId: createdId } = JSON.parse(text) as { caseId: string };
const db = getDb();
// Settled: the case waits for review or failed, or the execute step has finished or been skipped.
const deadline = Date.now() + 60_000;
let row;
let events;
do {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  [row] = await db.select().from(cases).where(eq(cases.id, createdId));
  events = await db
    .select({
      step: caseEvents.step,
      status: caseEvents.status,
      ms: caseEvents.durationMs,
      payload: caseEvents.payload,
    })
    .from(caseEvents)
    .where(eq(caseEvents.caseId, createdId))
    .orderBy(asc(caseEvents.seq));
  const replyDone = events.some(
    (e) => e.step === "reply" && e.status !== "started",
  );
  if (
    !row ||
    replyDone ||
    row.status === "AWAITING_REVIEW" ||
    row.status === "FAILED"
  ) {
    break;
  }
} while (Date.now() < deadline);

console.log({
  id: row?.id,
  expected: evalCase.expected,
  status: row?.status,
  decision: row?.decision,
  reasonCodes: row?.reasonCodes,
  error: row?.error,
});
console.table(
  events?.map(({ payload, ...rest }) => ({
    ...rest,
    result: JSON.stringify(payload).slice(0, 70),
  })),
);
console.table(
  (
    await db
      .select({
        step: screenshots.step,
        caption: screenshots.caption,
        mime: screenshots.mime,
        data: screenshots.data,
      })
      .from(screenshots)
      .where(eq(screenshots.caseId, createdId))
      .orderBy(desc(screenshots.createdAt))
  ).map(({ data, ...rest }) => ({ ...rest, bytes: data.length })),
);
const [reply] = await db
  .select({ key: replies.templateKey, subject: replies.subject })
  .from(replies)
  .where(eq(replies.caseId, createdId));
console.log("reply:", reply ?? "none");
process.exit(row?.status === "FAILED" ? 1 : 0);
