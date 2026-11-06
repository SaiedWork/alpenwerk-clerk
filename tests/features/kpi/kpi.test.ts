import { describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { loadKpis } from "@/features/kpi/server/load-kpis";
import { summarizeKpis, type KpiRaw } from "@/features/kpi/view/kpi";

const raw: KpiRaw = {
  total: 10,
  byDecision: { AUTO_EXECUTE: 3, NEEDS_REVIEW: 4, REPLY_ONLY: 1 },
  undecided: 2,
  byIntent: { address_change: 3, bank_change: 3, termination: 1, other: 1 },
  unrecognizedIntent: 2,
  byStatus: {
    RECEIVED: 1,
    ANALYZED: 0,
    IDENTIFIED: 0,
    EVALUATED: 0,
    AWAITING_REVIEW: 2,
    EXECUTING: 0,
    VERIFIED: 0,
    REPLY_READY: 1,
    DONE: 5,
    FAILED: 1,
    REJECTED: 0,
  },
  waitingForHuman: 3,
  avgHandlingMs: 2500,
  liveCallsToday: 1,
  liveCallsTotal: 4,
  estCostUsd: 0.0123,
};

describe("summarizeKpis", () => {
  it("computes the auto share over decided cases only", () => {
    const v = summarizeKpis(raw);
    expect(v.decided).toBe(8);
    expect(v.autoSharePct).toBe(38); // 3 / 8
  });

  it("has no share before any decision", () => {
    const empty = summarizeKpis({
      ...raw,
      byDecision: { AUTO_EXECUTE: 0, NEEDS_REVIEW: 0, REPLY_ONLY: 0 },
    });
    expect(empty.autoSharePct).toBeNull();
  });
});

// Reads the real database (run with `node --env-file=.env.local ...`); skipped without one.
describe.skipIf(!process.env.DATABASE_URL)("loadKpis (database)", () => {
  it("adds up consistently", async () => {
    const k = await loadKpis(getDb());
    const decisions = Object.values(k.byDecision).reduce((a, b) => a + b, 0);
    expect(decisions + k.undecided).toBe(k.total);
    const intents = Object.values(k.byIntent).reduce((a, b) => a + b, 0);
    expect(intents + k.unrecognizedIntent).toBe(k.total);
    expect(k.waitingForHuman).toBe(
      k.byStatus.AWAITING_REVIEW + k.byStatus.REPLY_READY,
    );
    expect(k.liveCallsToday).toBeLessThanOrEqual(k.liveCallsTotal);
  });
});
