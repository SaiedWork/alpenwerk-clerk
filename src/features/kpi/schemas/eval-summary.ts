import { z } from "zod";

const fraction = z.number().min(0).max(1);

/**
 * Shape of `public/eval-summary.json`: the replay eval result shown on the KPI page.
 * Written by `pnpm eval:summary`, checked for drift in CI. No timestamp on purpose, so the
 * file only changes when the result changes.
 */
export const evalSummarySchema = z.strictObject({
  cases: z.number().int().nonnegative(),
  allCorrect: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative(),
  promptVersion: z.string().min(1),
  schemaVersion: z.string().min(1),
  models: z.array(z.string().min(1)),
  metrics: z.strictObject({
    intent: fraction,
    intents: fraction,
    fields: fraction,
    decision: fraction,
    reasonCodes: fraction,
  }),
});

export type EvalSummaryFile = z.infer<typeof evalSummarySchema>;
