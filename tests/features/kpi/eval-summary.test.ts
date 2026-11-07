import { describe, expect, it } from "vitest";
import { parseEvalSummary } from "@/features/kpi/server/eval-summary";

const valid = {
  cases: 24,
  allCorrect: 24,
  errors: 0,
  promptVersion: "2",
  schemaVersion: "1",
  models: ["claude-haiku-5-5"],
  metrics: { intent: 1, intents: 1, fields: 1, decision: 1, reasonCodes: 1 },
};

describe("parseEvalSummary", () => {
  it("accepts a valid summary", () => {
    expect(parseEvalSummary(valid)).toEqual(valid);
  });

  it.each([
    ["null", null],
    [
      "a metric above 1",
      { ...valid, metrics: { ...valid.metrics, intent: 2 } },
    ],
    ["an unknown key", { ...valid, extra: true }],
    ["a missing field", { ...valid, cases: undefined }],
  ])("returns null for %s", (_name, raw) => {
    expect(parseEvalSummary(raw)).toBeNull();
  });
});
