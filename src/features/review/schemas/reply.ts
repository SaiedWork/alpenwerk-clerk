import { z } from "zod";
import { containsFullIban } from "@/agent/templates/render";

const reviewer = z.string().trim().min(1).max(60);

/** A reviewer's edit of a reply draft. Same safety rule as the renderer: no full IBAN. */
export const replyEditSchema = z
  .strictObject({
    caseId: z.uuid(),
    subject: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(/^[^\r\n]+$/, "one line"),
    body: z.string().trim().min(1).max(4000),
    reviewerLabel: reviewer,
  })
  .refine(
    (r) => !containsFullIban(r.subject) && !containsFullIban(r.body),
    "full IBAN",
  );

export const replySendSchema = z.strictObject({
  caseId: z.uuid(),
  reviewerLabel: reviewer,
});
