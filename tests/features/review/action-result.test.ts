import { describe, expect, it } from "vitest";
import { toActionResult } from "@/features/review/actions/action-result";
import { ReviewError } from "@/features/review/server/errors";
import { replyEditSchema } from "@/features/review/schemas/reply";
import { reviewInputSchema } from "@/features/review/schemas/review";
import { REVIEWER_LABEL } from "@/features/review/reviewer";
import { t } from "@/lib/i18n-de";

const ID = "11111111-1111-4111-8111-111111111111";

describe("toActionResult", () => {
  it("passes success through", async () => {
    expect(await toActionResult(async () => {})).toEqual({ ok: true });
  });

  it("maps a ReviewError to its code", async () => {
    const result = await toActionResult(async () => {
      throw new ReviewError("CASE_NOT_AWAITING_REVIEW", "x");
    });
    expect(result).toEqual({ ok: false, error: "CASE_NOT_AWAITING_REVIEW" });
  });

  it("maps invalid input and unexpected errors without leaking details", async () => {
    const invalid = await toActionResult(async () => {
      replyEditSchema.parse({});
    });
    expect(invalid).toEqual({ ok: false, error: "INVALID_INPUT" });

    const unknown = await toActionResult(async () => {
      throw new Error("db password leaked");
    });
    expect(unknown).toEqual({ ok: false, error: "UNKNOWN" });
  });

  it("has a German message for every error code", () => {
    for (const code of [
      "CASE_NOT_FOUND",
      "CASE_NOT_AWAITING_REVIEW",
      "CASE_AWAITING_REVIEW",
      "CASE_FINISHED",
      "CASE_NOT_STUCK",
      "CASE_NOT_REPLY_READY",
      "REPLY_NOT_FOUND",
      "REPLY_NOT_DRAFT",
      "INVALID_INPUT",
      "UNKNOWN",
    ] as const) {
      expect(t.console.case.review.errors[code].length).toBeGreaterThan(0);
    }
  });
});

describe("action inputs", () => {
  it("accepts the fixed reviewer label and an empty note", () => {
    const parsed = reviewInputSchema.parse({
      caseId: ID,
      note: "",
      reviewerLabel: REVIEWER_LABEL,
    });
    expect(parsed.note).toBeNull();
  });

  it("rejects a note over 500 characters and a full IBAN in an edit", () => {
    expect(() =>
      reviewInputSchema.parse({
        caseId: ID,
        note: "x".repeat(501),
        reviewerLabel: REVIEWER_LABEL,
      }),
    ).toThrow();
    expect(() =>
      replyEditSchema.parse({
        caseId: ID,
        subject: "s",
        body: "IBAN DE89 3704 0044 0532 0130 00",
        reviewerLabel: REVIEWER_LABEL,
      }),
    ).toThrow();
  });
});
