import { describe, expect, it } from "vitest";
import { stateFromEvents } from "@/agent/pipeline/state";
import type { StoredEvent } from "@/agent/pipeline/types";
import { auditEntrySchema } from "@/db/audit";
import { buildCaseView } from "@/features/cases/view/case-view";
import { containsFullIban } from "@/agent/templates/render";
import { buildDemoCases } from "../../seed/demo-cases";

const NOW = new Date("2026-11-06T12:00:00Z");
const cases = buildDemoCases(NOW);
const byN = (n: number) => {
  const c = cases.find((x) => x.id.endsWith(String(n).padStart(12, "0")));
  if (!c) throw new Error(`no demo case ${n}`);
  return c;
};

describe("demo cases", () => {
  it("builds eight cases with unique ids, oldest first", () => {
    expect(cases).toHaveLength(8);
    expect(new Set(cases.map((c) => c.id)).size).toBe(8);
    const times = cases.map((c) => c.receivedAt.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("pins what the real rule engine decides for each scenario", () => {
    const summary = cases.map((c) => [
      c.id.slice(-1),
      c.status,
      c.decision,
      c.reasonCodes.join(","),
    ]);
    expect(summary).toEqual(
      expect.arrayContaining([
        ["1", "DONE", "AUTO_EXECUTE", ""],
        ["2", "DONE", "AUTO_EXECUTE", ""],
        ["3", "DONE", "REPLY_ONLY", "ADDR_INCOMPLETE"],
        ["4", "DONE", "REPLY_ONLY", "BANK_IBAN_INVALID"],
        ["5", "AWAITING_REVIEW", "NEEDS_REVIEW", "TERM_ALWAYS_REVIEW"],
        ["6", "AWAITING_REVIEW", "NEEDS_REVIEW", "BANK_HOLDER_MISMATCH"],
        ["7", "REPLY_READY", "NEEDS_REVIEW", "BANK_NO_MANDATE"],
        [
          "8",
          "DONE",
          "NEEDS_REVIEW",
          "TERM_ALWAYS_REVIEW,TERM_IRREVOCABLE_BENEFICIARY",
        ],
      ]),
    );
  });

  it("keeps the timeline in the shape the pipeline reads back", () => {
    for (const c of cases) {
      const events: StoredEvent[] = c.events.map((e, i) => ({
        id: i + 1,
        seq: e.seq,
        step: e.step,
        status: e.status,
        payload: JSON.parse(JSON.stringify(e.payload)),
        durationMs: e.durationMs,
      }));
      // Throws a PipelineStateError for any payload the runner would reject.
      const state = stateFromEvents(events);
      expect(state.evaluation?.decision).toBe(c.decision);
      expect(events.map((e) => e.seq)).toEqual(events.map((_, i) => i + 1));
    }
  });

  it("only executes cases the rules allowed, and only those change the legacy record", () => {
    const executed = cases.filter((c) =>
      c.events.some((e) => e.step === "execute" && e.status === "succeeded"),
    );
    expect(executed.map((c) => c.id.slice(-1)).sort()).toEqual(["1", "2"]);
    expect(
      cases
        .filter((c) => c.legacyChange)
        .map((c) => c.id.slice(-1))
        .sort(),
    ).toEqual(["1", "2"]);
    for (const c of executed) expect(c.decision).toBe("AUTO_EXECUTE");
  });

  it("walks the human paths: gate, rejected draft, edited and sent", () => {
    expect(byN(5).reply).toBeNull();
    expect(byN(5).review).toBeNull();
    expect(byN(7).review?.decision).toBe("reject");
    expect(byN(7).reply).toMatchObject({
      templateKey: "rejected_by_reviewer",
      status: "draft",
      editedByHuman: false,
    });
    expect(byN(8).reply).toMatchObject({
      status: "simulated_sent",
      editedByHuman: true,
    });
    const actions = byN(8).audit.map((a) => a.action);
    expect(actions.indexOf("review.rejected")).toBeLessThan(
      actions.indexOf("reply.edited"),
    );
    expect(actions.indexOf("reply.edited")).toBeLessThan(
      actions.indexOf("reply.sent_simulated"),
    );
  });

  it("never puts a full IBAN into a reply, the timeline summary or the audit", () => {
    for (const c of cases) {
      if (c.reply) {
        expect(containsFullIban(c.reply.subject + c.reply.body)).toBe(false);
      }
      const audit = JSON.stringify(c.audit);
      expect(containsFullIban(audit)).toBe(false);
      for (const a of c.audit) {
        expect(
          auditEntrySchema.safeParse({
            caseId: c.id,
            actor: a.actor,
            action: a.action,
            details: a.details,
          }).success,
        ).toBe(true);
      }
    }
  });

  it("audit rows are chronological per case and start with the receipt", () => {
    for (const c of cases) {
      const times = c.audit.map((a) => a.at.getTime());
      expect(times).toEqual([...times].sort((a, b) => a - b));
      expect(c.audit[0].action).toBe("case.received");
    }
  });

  it("renders in the console: no case is stuck, waiting cases offer a preview", () => {
    for (const c of cases) {
      const view = buildCaseView(
        {
          case: {
            id: c.id,
            receivedAt: c.receivedAt,
            updatedAt: c.updatedAt,
            fromEmail: c.fromEmail,
            subject: c.subject,
            body: c.body,
            status: c.status,
            intent: c.extraction.primaryIntent,
            decision: c.decision,
            confidence: c.extraction.confidence.toFixed(3),
            extracted: JSON.parse(JSON.stringify(c.extraction)),
            reasonCodes: c.reasonCodes,
            handlingMs: c.handlingMs,
          },
          events: c.events.map((e, i) => ({
            id: i + 1,
            seq: e.seq,
            step: e.step,
            status: e.status,
            payload: JSON.parse(JSON.stringify(e.payload)),
            durationMs: e.durationMs,
          })),
          screenshots: [],
          reply: c.reply,
          review: c.review,
        },
        NOW,
      );
      expect(view.canResume).toBe(false);
      expect(view.inFlight).toBe(false);
      expect(view.timeline.every((t) => t.summary !== null || t.step)).toBe(
        true,
      );
      if (c.status === "AWAITING_REVIEW") {
        expect(view.replyPreview).not.toBeNull();
      }
    }
  });
});
