import { describe, expect, it, vi } from "vitest";
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

function setup(
  options: {
    evalCase?: (typeof cases)[number];
    entries?: SeedCacheEntry[];
    reader?: LegacySnapshotReader;
  } = {},
) {
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
    llm: () => ({ ...stores, model: null, modelName: "replay", dailyCap: 0 }),
    now: () => EVAL_NOW,
  };
  return { ...memory, deps, id: c.id, reader };
}

describe("runPipeline", () => {
  it("runs analyze, identify, evaluate and records an event per step", async () => {
    const { deps, id, events, caseState } = setup();

    expect(await runPipeline(id, deps)).toEqual({ outcome: "completed" });

    expect(events(id).map((e) => [e.seq, e.step, e.status])).toEqual([
      [1, "analyze", "succeeded"],
      [2, "identify", "succeeded"],
      [3, "evaluate", "succeeded"],
    ]);
    expect(events(id).every((e) => e.durationMs !== null)).toBe(true);
    expect(caseState(id)).toMatchObject({
      status: "EVALUATED",
      intent: "bank_change",
      decision: "AUTO_EXECUTE",
      reasonCodes: [],
      error: null,
    });
    expect(caseState(id).handlingMs).toBeGreaterThanOrEqual(0);
  });

  it("stops at AWAITING_REVIEW when the decision is NEEDS_REVIEW", async () => {
    const t01 = cases.find((c) => c.id === "T01")!;
    const { deps, id, caseState } = setup({ evalCase: t01 });
    await runPipeline(id, deps);
    expect(caseState(id)).toMatchObject({
      status: "AWAITING_REVIEW",
      decision: "NEEDS_REVIEW",
    });
  });

  it("is a no-op when run again after success", async () => {
    const { deps, id, events, reader } = setup();
    await runPipeline(id, deps);
    expect(await runPipeline(id, deps)).toEqual({ outcome: "already_done" });
    expect(events(id)).toHaveLength(3);
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
    ]);
    expect(analyzeKeyCalls).toHaveBeenCalledTimes(1);
    expect(caseState(id)).toMatchObject({ status: "EVALUATED", error: null });
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

// Integration check: the pipeline reproduces what the eval suite expects for every case.
describe.skipIf(entries.length === 0).each(cases)("eval case $id", (c) => {
  it("reaches the expected decision and reason codes", async () => {
    const { deps, id, caseState } = setup({ evalCase: c });
    expect(await runPipeline(id, deps)).toEqual({ outcome: "completed" });
    const state = caseState(id);
    expect(state.intent).toBe(c.expected.intent);
    expect(state.decision).toBe(c.expected.decision);
    expect([...(state.reasonCodes ?? [])].sort()).toEqual(
      [...c.expected.reasonCodes].sort(),
    );
    expect(state.status).toBe(
      c.expected.decision === "NEEDS_REVIEW" ? "AWAITING_REVIEW" : "EVALUATED",
    );
  });
});

void computeCacheKey;
