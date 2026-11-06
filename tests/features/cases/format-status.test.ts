import { describe, expect, it } from "vitest";
import { caseStatuses } from "@/db/schema/app";
import { formatHandlingTime } from "@/features/cases/format";
import { isBeingProcessed, isInFlight } from "@/features/cases/status";
import { STUCK_AFTER_MS } from "@/features/review/server/review-case";

describe("formatHandlingTime", () => {
  it.each([
    [null, "–"],
    [0, "0,0 s"],
    [3400, "3,4 s"],
    [59_949, "59,9 s"],
    [65_000, "1 min 5 s"],
    [120_000, "2 min 0 s"],
  ])("formats %s as %s", (ms, expected) => {
    expect(formatHandlingTime(ms)).toBe(expected);
  });
});

describe("isInFlight", () => {
  it("is false for cases waiting for a human or finished", () => {
    expect(
      isInFlight({ status: "AWAITING_REVIEW", decision: "NEEDS_REVIEW" }),
    ).toBe(false);
    expect(isInFlight({ status: "DONE", decision: "AUTO_EXECUTE" })).toBe(
      false,
    );
    expect(isInFlight({ status: "FAILED", decision: null })).toBe(false);
  });

  it("treats REPLY_READY as in flight only without a review", () => {
    expect(
      isInFlight({ status: "REPLY_READY", decision: "NEEDS_REVIEW" }),
    ).toBe(false);
    expect(
      isInFlight({ status: "REPLY_READY", decision: "AUTO_EXECUTE" }),
    ).toBe(true);
  });

  it("treats every other status as in flight", () => {
    const rest = caseStatuses.filter(
      (s) => !["AWAITING_REVIEW", "DONE", "FAILED", "REPLY_READY"].includes(s),
    );
    for (const status of rest) {
      expect(isInFlight({ status, decision: null })).toBe(true);
    }
  });
});

describe("isBeingProcessed", () => {
  const now = new Date("2026-11-06T12:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);

  it("is true for a recently updated case in flight", () => {
    expect(
      isBeingProcessed(
        {
          status: "EXECUTING",
          decision: "AUTO_EXECUTE",
          updatedAt: ago(5_000),
        },
        now,
      ),
    ).toBe(true);
  });

  it("stops once nothing happened for the stuck window, so pages stop polling", () => {
    expect(
      isBeingProcessed(
        {
          status: "EXECUTING",
          decision: "AUTO_EXECUTE",
          updatedAt: ago(STUCK_AFTER_MS),
        },
        now,
      ),
    ).toBe(false);
  });

  it("is false for cases that are not in flight at all", () => {
    expect(
      isBeingProcessed(
        { status: "DONE", decision: "AUTO_EXECUTE", updatedAt: ago(1_000) },
        now,
      ),
    ).toBe(false);
  });
});
