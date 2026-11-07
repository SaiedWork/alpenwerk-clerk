import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PROMPT_VERSION } from "@/agent/llm/prompt";
import { SCHEMA_VERSION } from "@/agent/llm/schema";
import { evalSummarySchema } from "@/features/kpi/schemas/eval-summary";
import type { EvalSummary } from "../../evals/score";
import { buildEvalSummaryFile } from "../../evals/summary";

const summary: EvalSummary = {
  total: 24,
  errors: 0,
  intentAccuracy: 23 / 24,
  intentsAccuracy: 1,
  fieldAccuracy: 0.98765432,
  decisionAccuracy: 1,
  reasonCodeAccuracy: 1,
  allCorrect: 23,
};

describe("buildEvalSummaryFile", () => {
  it("maps metrics, rounds to four decimals and lists models once, sorted", () => {
    const file = buildEvalSummaryFile(summary, [
      { key: "a", response: {}, model: "m-b" },
      { key: "b", response: {}, model: "m-a" },
      { key: "c", response: {}, model: "m-b" },
    ]);
    expect(file).toEqual({
      cases: 24,
      allCorrect: 23,
      errors: 0,
      promptVersion: PROMPT_VERSION,
      schemaVersion: SCHEMA_VERSION,
      models: ["m-a", "m-b"],
      metrics: {
        intent: 0.9583,
        intents: 1,
        fields: 0.9877,
        decision: 1,
        reasonCodes: 1,
      },
    });
  });
});

describe("committed public/eval-summary.json", () => {
  it("is valid and matches the current prompt and schema versions", () => {
    const raw: unknown = JSON.parse(
      readFileSync(
        path.join(process.cwd(), "public", "eval-summary.json"),
        "utf8",
      ),
    );
    const file = evalSummarySchema.parse(raw);
    expect(file.promptVersion).toBe(PROMPT_VERSION);
    expect(file.schemaVersion).toBe(SCHEMA_VERSION);
    expect(file.errors).toBe(0);
  });
});
