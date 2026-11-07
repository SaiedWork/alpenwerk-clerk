import { PROMPT_VERSION } from "@/agent/llm/prompt";
import { SCHEMA_VERSION } from "@/agent/llm/schema";
import type { SeedCacheEntry } from "@/agent/llm/seed-file";
import {
  evalSummarySchema,
  type EvalSummaryFile,
} from "@/features/kpi/schemas/eval-summary";
import type { EvalSummary } from "./score";

const round = (x: number) => Math.round(x * 10_000) / 10_000;

/** Turns the replay result into the committed summary file; validated before it is returned. */
export function buildEvalSummaryFile(
  summary: EvalSummary,
  entries: SeedCacheEntry[],
): EvalSummaryFile {
  return evalSummarySchema.parse({
    cases: summary.total,
    allCorrect: summary.allCorrect,
    errors: summary.errors,
    promptVersion: PROMPT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    models: [...new Set(entries.map((e) => e.model))].sort(),
    metrics: {
      intent: round(summary.intentAccuracy),
      intents: round(summary.intentsAccuracy),
      fields: round(summary.fieldAccuracy),
      decision: round(summary.decisionAccuracy),
      reasonCodes: round(summary.reasonCodeAccuracy),
    },
  });
}
