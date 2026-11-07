import {
  evalSummarySchema,
  type EvalSummaryFile,
} from "@/features/kpi/schemas/eval-summary";

/** Validates the committed summary; an invalid file hides the badge instead of breaking the page. */
export function parseEvalSummary(raw: unknown): EvalSummaryFile | null {
  const result = evalSummarySchema.safeParse(raw);
  return result.success ? result.data : null;
}
