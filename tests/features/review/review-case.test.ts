import { describe, expect, it, vi } from "vitest";
import type { CaseStatus } from "@/agent/pipeline/types";
import { ReviewError } from "@/features/review/server/errors";
import {
  approveCase,
  rejectCase,
  resumeCase,
  STUCK_AFTER_MS,
} from "@/features/review/server/review-case";
import type { ReviewStore } from "@/features/review/server/review-store";

vi.mock("@/lib/logger", () => {
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return { logger: log, caseLogger: () => log };
});

const ID = "7b9c2f0e-5a1d-4c3b-8e2f-1a2b3c4d5e6f";
const NOW = new Date("2026-11-06T10:00:00Z");

/** In-memory `ReviewStore` with the same guard as the SQL version. */
function memoryStore(status: CaseStatus, updatedAt = NOW) {
  const state = { status, updatedAt };
  const reviews: { decision: string; note: string | null; label: string }[] =
    [];
  const store: ReviewStore = {
    async decide(i) {
      if (i.caseId !== ID) return "not_found";
      if (state.status !== "AWAITING_REVIEW") return "not_awaiting";
      state.status = i.nextStatus;
      reviews.push({
        decision: i.decision,
        note: i.note,
        label: i.reviewerLabel,
      });
      return "ok";
    },
    async getCaseState(id) {
      return id === ID ? { ...state } : null;
    },
    async hasApproval() {
      return reviews.some((r) => r.decision === "approve");
    },
  };
  return { store, state, reviews };
}

const input = { caseId: ID, note: "  ok  ", reviewerLabel: "Prüferin" };
const codeOf = async (p: Promise<unknown>) =>
  p.then(
    () => null,
    (e: unknown) => (e instanceof ReviewError ? e.code : "OTHER"),
  );

describe("approveCase", () => {
  it("writes one review, claims the case and schedules a run", async () => {
    const m = memoryStore("AWAITING_REVIEW");
    const schedule = vi.fn();
    await approveCase(input, { store: m.store, schedule });
    expect(m.reviews).toEqual([
      { decision: "approve", note: "ok", label: "Prüferin" },
    ]);
    expect(m.state.status).toBe("EXECUTING");
    expect(schedule).toHaveBeenCalledExactlyOnceWith(ID);
  });

  it("a double approve writes no second review and schedules once", async () => {
    const m = memoryStore("AWAITING_REVIEW");
    const schedule = vi.fn();
    await approveCase(input, { store: m.store, schedule });
    expect(await codeOf(approveCase(input, { store: m.store, schedule }))).toBe(
      "CASE_NOT_AWAITING_REVIEW",
    );
    expect(m.reviews).toHaveLength(1);
    expect(schedule).toHaveBeenCalledTimes(1);
  });

  it("fails for an unknown case and for invalid input", async () => {
    const m = memoryStore("AWAITING_REVIEW");
    const schedule = vi.fn();
    const other = "11111111-1111-4111-8111-111111111111";
    expect(
      await codeOf(
        approveCase({ ...input, caseId: other }, { store: m.store, schedule }),
      ),
    ).toBe("CASE_NOT_FOUND");
    await expect(
      approveCase(
        { ...input, reviewerLabel: " " },
        { store: m.store, schedule },
      ),
    ).rejects.toThrow();
    await expect(
      approveCase({ ...input, approved: true }, { store: m.store, schedule }),
    ).rejects.toThrow();
    expect(schedule).not.toHaveBeenCalled();
  });
});

describe("rejectCase", () => {
  it("ends the case as REJECTED and never runs it", async () => {
    const m = memoryStore("AWAITING_REVIEW");
    const schedule = vi.fn();
    await rejectCase(
      { caseId: ID, reviewerLabel: "Prüfer" },
      { store: m.store, schedule },
    );
    expect(m.state.status).toBe("REJECTED");
    expect(m.reviews).toEqual([
      { decision: "reject", note: null, label: "Prüfer" },
    ]);
    expect(schedule).not.toHaveBeenCalled();
    expect(await m.store.hasApproval(ID)).toBe(false);
  });

  it.each(["EVALUATED", "DONE", "REJECTED", "FAILED"] as const)(
    "refuses a case in status %s",
    async (status) => {
      const m = memoryStore(status);
      expect(
        await codeOf(rejectCase(input, { store: m.store, schedule: vi.fn() })),
      ).toBe("CASE_NOT_AWAITING_REVIEW");
      expect(m.reviews).toHaveLength(0);
    },
  );
});

describe("resumeCase", () => {
  const later = (ms: number) => () => new Date(NOW.getTime() + ms);
  const run = (status: CaseStatus, idleMs: number) => {
    const m = memoryStore(status);
    const schedule = vi.fn();
    const result = codeOf(
      resumeCase(ID, { store: m.store, schedule, now: later(idleMs) }),
    );
    return { result, schedule };
  };

  it("resumes a case that has been idle past the stuck window", async () => {
    const r = run("IDENTIFIED", STUCK_AFTER_MS);
    expect(await r.result).toBeNull();
    expect(r.schedule).toHaveBeenCalledExactlyOnceWith(ID);
  });

  it("retries a FAILED case immediately", async () => {
    const r = run("FAILED", 0);
    expect(await r.result).toBeNull();
    expect(r.schedule).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["IDENTIFIED", 1_000, "CASE_NOT_STUCK"],
    ["AWAITING_REVIEW", STUCK_AFTER_MS * 10, "CASE_AWAITING_REVIEW"],
    ["DONE", STUCK_AFTER_MS * 10, "CASE_FINISHED"],
    ["REJECTED", STUCK_AFTER_MS * 10, "CASE_FINISHED"],
  ] as const)("refuses %s (idle %i ms) with %s", async (status, idle, code) => {
    const r = run(status, idle);
    expect(await r.result).toBe(code);
    expect(r.schedule).not.toHaveBeenCalled();
  });

  it("fails for an unknown case", async () => {
    const m = memoryStore("FAILED");
    expect(
      await codeOf(
        resumeCase("11111111-1111-4111-8111-111111111111", {
          store: m.store,
          schedule: vi.fn(),
        }),
      ),
    ).toBe("CASE_NOT_FOUND");
  });

  it("an approved case that crashed mid-execution is resumable and still approved", async () => {
    const m = memoryStore("AWAITING_REVIEW");
    await approveCase(input, { store: m.store, schedule: vi.fn() });
    const schedule = vi.fn();
    await resumeCase(ID, {
      store: m.store,
      schedule,
      now: later(STUCK_AFTER_MS),
    });
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(await m.store.hasApproval(ID)).toBe(true);
  });
});
