import { z } from "zod";

/** What a reviewer submits with an approve or reject. */
export const reviewInputSchema = z.strictObject({
  caseId: z.uuid(),
  note: z
    .string()
    .trim()
    .max(500)
    .transform((s) => (s === "" ? null : s))
    .nullish()
    .transform((s) => s ?? null),
  reviewerLabel: z.string().trim().min(1).max(60),
});

export type ReviewInput = z.infer<typeof reviewInputSchema>;
