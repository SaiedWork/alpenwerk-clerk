import { describe, expect, it } from "vitest";
import { caseStatuses } from "@/db/schema/app";
import { formatHandlingTime } from "@/features/cases/format";
import { isInFlight } from "@/features/cases/status";

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
