import { describe, expect, it } from "vitest";
import { LlmBudgetError } from "@/agent/llm/errors";
import { describeFailure } from "@/agent/pipeline/failure";
import { t } from "@/lib/i18n-de";

describe("describeFailure", () => {
  it("shows the friendly cap message, with its code, when the daily cap is reached", () => {
    expect(describeFailure(new LlmBudgetError(150))).toEqual({
      code: "DAILY_CAP_REACHED",
      messageDe: t.llm.dailyCapReached,
    });
  });

  it("hides the raw message of unexpected errors", () => {
    expect(describeFailure(new Error("password=secret"))).toEqual({
      code: "UNEXPECTED_ERROR",
      messageDe: t.pipeline.stepFailed,
    });
  });
});
