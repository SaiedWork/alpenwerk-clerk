import { describe, expect, it, vi } from "vitest";
import type { LegacyWriter } from "@/agent/executor/driver";
import type { WriteOutcome } from "@/agent/executor/targets";
import type { LegacySnapshotReader } from "@/agent/executor/snapshot-reader";
import { computeCacheKey } from "@/agent/llm/cache-key";
import { ReplayMissError } from "@/agent/llm/errors";
import type { SeedCacheEntry } from "@/agent/llm/seed-file";
import { runPipeline } from "@/agent/pipeline/runner";
import type { PipelineDeps } from "@/agent/pipeline/types";
import { loadEvalCases } from "../../../evals/loader";
import {
  createMemoryStores,
  readSeedCache,
} from "../../../evals/memory-stores";
import {
  EVAL_NOW,
  findFixture,
  snapshotFromFixture,
} from "../../../evals/snapshot";
import { createMemoryPipelineStore } from "./memory-store";

vi.mock("@/lib/logger", () => {
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return { logger: log, caseLogger: () => log };
});

const entries = readSeedCache() ?? [];
const cases = loadEvalCases();
const b01 = cases.find((c) => c.id === "B01")!;

/** Records every write; answers with `outcome` (default: the change was made). */
function recordingWriter(outcome: WriteOutcome = "changed") {
  return {
    updateAddress: vi.fn(async () => outcome),
    updateBank: vi.fn(async () => outcome),
  } satisfies LegacyWriter;
}

function setup(
  options: {
    evalCase?: (typeof cases)[number];
    entries?: SeedCacheEntry[];
    reader?: LegacySnapshotReader;
    /** `null`: no writer at all (seed mode). */
    writer?: ReturnType<typeof recordingWriter> | null;
    approved?: boolean;
  } = {},
) {
  const writer =
    options.writer === null ? undefined : (options.writer ?? recordingWriter());
  const c = options.evalCase ?? b01;
  const memory = createMemoryPipelineStore([
    {
      id: c.id,
      fromEmail: c.email.from,
      subject: c.email.subject,
      body: c.email.body,
    },
  ]);
  const fixture = findFixture(c.policyFixture);
  const reader: LegacySnapshotReader = options.reader ?? {
    readPolicy: vi.fn(async () =>
      fixture ? snapshotFromFixture(fixture) : null,
    ),
  };
  const stores = createMemoryStores(options.entries ?? entries);
  const deps: PipelineDeps = {
    store: memory.store,
    reader,
    writer,
    approved: options.approved,
    llm: () => ({ ...stores, model: null, modelName: "replay", dailyCap: 0 }),
    now: () => EVAL_NOW,
  };
  return { ...memory, deps, id: c.id, reader, writer };
}

describe("runPipeline", () => {
  it("runs analyze, identify, evaluate, execute and records an event per step", async () => {
    const { deps, id, events, caseState } = setup();

    expect(await runPipeline(id, deps)).toEqual({ outcome: "completed" });

    expect(events(id).map((e) => [e.seq, e.step, e.status])).toEqual([
      [1, "analyze", "succeeded"],
      [2, "identify", "succeeded"],
      [3, "evaluate", "succeeded"],
      [4, "execute", "succeeded"],
    ]);
    expect(events(id).every((e) => e.durationMs !== null)).toBe(true);
    expect(caseState(id)).toMatchObject({
      status: "EXECUTING",
      intent: "bank_change",
      decision: "AUTO_EXECUTE",
      reasonCodes: [],
      error: null,
    });
    expect(caseState(id).handlingMs).toBeGreaterThanOrEqual(0);
  });

  it("stops at AWAITING_REVIEW when the decision is NEEDS_REVIEW", async () => {
    const t01 = cases.find((c) => c.id === "T01")!;
    const { deps, id, caseState, events } = setup({ evalCase: t01 });
    expect(await runPipeline(id, deps)).toEqual({
      outcome: "awaiting_review",
    });
    expect(events(id).map((e) => e.step)).not.toContain("execute");
    expect(caseState(id)).toMatchObject({
      status: "AWAITING_REVIEW",
      decision: "NEEDS_REVIEW",
    });
  });

  it("is a no-op when run again after success", async () => {
    const { deps, id, events, reader } = setup();
    await runPipeline(id, deps);
    expect(await runPipeline(id, deps)).toEqual({ outcome: "already_done" });
    expect(events(id)).toHaveLength(4);
    expect(reader.readPolicy).toHaveBeenCalledTimes(1);
  });

  it("returns not_found for an unknown case", async () => {
    const { deps } = setup();
    expect(await runPipeline("nope", deps)).toEqual({ outcome: "not_found" });
  });

  it("records a replay miss as a failed analyze step with a code and German message", async () => {
    const { deps, id, events, caseState } = setup({ entries: [] });

    expect(await runPipeline(id, deps)).toEqual({
      outcome: "failed",
      step: "analyze",
      code: new ReplayMissError().code,
    });
    expect(events(id).map((e) => [e.step, e.status])).toEqual([
      ["analyze", "failed"],
    ]);
    expect(events(id)[0].payload).toMatchObject({ code: "REPLAY_MISS" });
    expect(caseState(id)).toMatchObject({
      status: "FAILED",
      error: { code: "REPLAY_MISS", step: "analyze" },
    });
    expect(caseState(id).error?.messageDe).toMatch(/Beispiel-E-Mail/);
  });

  it("resumes at the failed step without repeating finished ones", async () => {
    let fail = true;
    const readPolicy = vi.fn(async (policyNo: string) => {
      if (fail) throw new Error("browser down");
      const fixture = findFixture(b01.policyFixture);
      return fixture && fixture.policy.policyNo === policyNo
        ? snapshotFromFixture(fixture)
        : null;
    });
    const { deps, id, events, caseState } = setup({ reader: { readPolicy } });
    const analyzeKeyCalls = vi.spyOn(deps, "llm");

    expect(await runPipeline(id, deps)).toMatchObject({
      outcome: "failed",
      step: "identify",
      code: "UNEXPECTED_ERROR",
    });
    // The raw error message is not stored on the case.
    expect(JSON.stringify(caseState(id))).not.toContain("browser down");

    fail = false;
    expect(await runPipeline(id, deps)).toEqual({ outcome: "completed" });

    expect(events(id).map((e) => [e.seq, e.step, e.status])).toEqual([
      [1, "analyze", "succeeded"],
      [2, "identify", "failed"],
      [3, "identify", "succeeded"],
      [4, "evaluate", "succeeded"],
      [5, "execute", "succeeded"],
    ]);
    expect(analyzeKeyCalls).toHaveBeenCalledTimes(1);
    expect(caseState(id)).toMatchObject({ status: "EXECUTING", error: null });
  });

  it("ignores a stale started row left by a crashed invocation", async () => {
    const { deps, id, events, store } = setup();
    await store.startEvent(id, "analyze");
    expect(await runPipeline(id, deps)).toEqual({ outcome: "completed" });
    expect(events(id).map((e) => e.status)).toEqual([
      "started",
      "succeeded",
      "succeeded",
      "succeeded",
      "succeeded",
    ]);
  });

  it("skips identify without a policy number and lets the rules judge", async () => {
    const x04 = cases.find((c) => c.id === "X04")!;
    const { deps, id, events, caseState } = setup({ evalCase: x04 });
    await runPipeline(id, deps);
    expect(events(id).map((e) => e.status)).toEqual([
      "succeeded",
      "skipped",
      "succeeded",
    ]);
    expect(caseState(id)).toMatchObject({ decision: "NEEDS_REVIEW" });
  });

  it("fails clearly when a stored payload is unreadable", async () => {
    const { deps, id, store, events } = setup();
    const { eventId } = await store.startEvent(id, "analyze");
    await store.finishEvent(eventId, {
      status: "succeeded",
      payload: { junk: 1 },
      durationMs: 1,
    });
    expect(await runPipeline(id, deps)).toMatchObject({
      outcome: "failed",
      step: "identify",
      code: "STATE_INVALID",
    });
    expect(events(id).at(-1)?.status).toBe("failed");
  });
});

describe("execute step", () => {
  const byId = (key: string) => cases.find((c) => c.id === key)!;

  it("writes a bank change from the validated params and keeps the IBAN off the timeline", async () => {
    const { deps, id, events, writer } = setup();
    await runPipeline(id, deps);
    expect(writer!.updateBank).toHaveBeenCalledOnce();
    expect(writer!.updateBank).toHaveBeenCalledWith(
      "AW-100102",
      expect.objectContaining({ iban: "DE89370400440532013000" }),
    );
    const payload = events(id).find((e) => e.step === "execute")?.payload;
    expect(payload).toMatchObject({ kind: "bank_change", outcome: "changed" });
    expect(JSON.stringify(payload)).not.toContain("DE89370400440532013000");
    expect(JSON.stringify(payload)).toContain("DE89 **** ****");
  });

  it("writes an address change", async () => {
    const { deps, id, writer } = setup({ evalCase: byId("A01") });
    await runPipeline(id, deps);
    expect(writer!.updateAddress).toHaveBeenCalledOnce();
    expect(writer!.updateBank).not.toHaveBeenCalled();
  });

  it("counts an unchanged result as success", async () => {
    const { deps, id, caseState, events } = setup({
      writer: recordingWriter("unchanged"),
    });
    expect(await runPipeline(id, deps)).toEqual({ outcome: "completed" });
    expect(events(id).at(-1)).toMatchObject({
      step: "execute",
      status: "succeeded",
    });
    expect(caseState(id).status).toBe("EXECUTING");
  });

  it("skips REPLY_ONLY cases and never calls the writer", async () => {
    const { deps, id, events, caseState, writer } = setup({
      evalCase: byId("B03"),
    });
    expect(await runPipeline(id, deps)).toEqual({ outcome: "completed" });
    expect(events(id).at(-1)).toMatchObject({
      step: "execute",
      status: "skipped",
      payload: { reason: "NO_ACTION" },
    });
    expect(caseState(id).status).toBe("EVALUATED");
    expect(writer!.updateAddress).not.toHaveBeenCalled();
    expect(writer!.updateBank).not.toHaveBeenCalled();
  });

  it("skips with NO_BROWSER when there is no writer (seed mode)", async () => {
    const { deps, id, events, caseState } = setup({ writer: null });
    expect(await runPipeline(id, deps)).toEqual({ outcome: "completed" });
    expect(events(id).at(-1)).toMatchObject({
      status: "skipped",
      payload: { reason: "NO_BROWSER" },
    });
    expect(caseState(id).status).toBe("EVALUATED");
  });

  it("stops a NEEDS_REVIEW case before execute and runs it once approved", async () => {
    const b04 = byId("B04");
    const first = setup({ evalCase: b04 });
    expect(await runPipeline(first.id, first.deps)).toEqual({
      outcome: "awaiting_review",
    });
    expect(first.writer!.updateBank).not.toHaveBeenCalled();

    // The review gate re-runs the same case with the approval flag.
    const approved = { ...first.deps, approved: true };
    expect(await runPipeline(first.id, approved)).toEqual({
      outcome: "completed",
    });
    expect(first.writer!.updateBank).toHaveBeenCalledOnce();
    expect(first.caseState(first.id).status).toBe("EXECUTING");
  });

  it.each(["T01", "T02", "T03", "X01"])(
    "never writes %s, even when approved",
    async (key) => {
      const { deps, id, events, writer } = setup({
        evalCase: byId(key),
        approved: true,
      });
      expect(await runPipeline(id, deps)).toEqual({ outcome: "completed" });
      expect(events(id).at(-1)).toMatchObject({
        step: "execute",
        status: "skipped",
        payload: { reason: "NOT_AUTOMATABLE" },
      });
      expect(writer!.updateAddress).not.toHaveBeenCalled();
      expect(writer!.updateBank).not.toHaveBeenCalled();
    },
  );

  it.each(["no_mandate", "policy_not_found"] as const)(
    "fails with EXECUTE_PRECONDITION_FAILED on %s and succeeds on retry",
    async (outcome) => {
      const writer = recordingWriter(outcome);
      const { deps, id, caseState, events } = setup({ writer });
      expect(await runPipeline(id, deps)).toEqual({
        outcome: "failed",
        step: "execute",
        code: "EXECUTE_PRECONDITION_FAILED",
      });
      expect(caseState(id)).toMatchObject({
        status: "FAILED",
        error: { code: "EXECUTE_PRECONDITION_FAILED", step: "execute" },
      });

      writer.updateBank.mockResolvedValue("changed");
      expect(await runPipeline(id, deps)).toEqual({ outcome: "completed" });
      expect(
        events(id)
          .map((e) => [e.step, e.status])
          .slice(3),
      ).toEqual([
        ["execute", "failed"],
        ["execute", "succeeded"],
      ]);
      expect(caseState(id)).toMatchObject({ status: "EXECUTING", error: null });
    },
  );

  it("keeps a driver error code on the case", async () => {
    const writer = recordingWriter();
    writer.updateBank.mockRejectedValue(
      Object.assign(new Error("form"), { code: "LEGACY_FORM_REJECTED" }),
    );
    const { deps, id } = setup({ writer });
    expect(await runPipeline(id, deps)).toMatchObject({
      outcome: "failed",
      step: "execute",
      code: "LEGACY_FORM_REJECTED",
    });
  });

  it("does not write twice when run again after success", async () => {
    const { deps, id, writer } = setup();
    await runPipeline(id, deps);
    expect(await runPipeline(id, deps)).toEqual({ outcome: "already_done" });
    expect(writer!.updateBank).toHaveBeenCalledOnce();
  });
});

// Integration check: the pipeline reproduces what the eval suite expects for every case.
describe.skipIf(entries.length === 0).each(cases)("eval case $id", (c) => {
  it("reaches the expected decision and reason codes and executes only auto cases", async () => {
    const { deps, id, caseState, writer } = setup({ evalCase: c });
    const outcome = await runPipeline(id, deps);
    expect(outcome).toEqual({
      outcome:
        c.expected.decision === "NEEDS_REVIEW"
          ? "awaiting_review"
          : "completed",
    });
    const state = caseState(id);
    expect(state.intent).toBe(c.expected.intent);
    expect(state.decision).toBe(c.expected.decision);
    expect([...(state.reasonCodes ?? [])].sort()).toEqual(
      [...c.expected.reasonCodes].sort(),
    );
    expect(state.status).toBe(
      {
        NEEDS_REVIEW: "AWAITING_REVIEW",
        AUTO_EXECUTE: "EXECUTING",
        REPLY_ONLY: "EVALUATED",
      }[c.expected.decision],
    );
    const writes =
      writer!.updateAddress.mock.calls.length +
      writer!.updateBank.mock.calls.length;
    expect(writes).toBe(c.expected.decision === "AUTO_EXECUTE" ? 1 : 0);
  });
});

void computeCacheKey;
