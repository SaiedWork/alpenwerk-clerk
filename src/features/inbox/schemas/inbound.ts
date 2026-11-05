import { z } from "zod";
import { MAX_BODY_CHARS, MAX_SUBJECT_CHARS } from "@/agent/llm/limits";

/** Body of `POST /api/inbound/email`. Empty subject or body is allowed (spam, empty mails). */
export const inboundEmailSchema = z.strictObject({
  from: z.email(),
  subject: z.string().max(MAX_SUBJECT_CHARS),
  body: z.string().max(MAX_BODY_CHARS),
});

export type InboundEmail = z.infer<typeof inboundEmailSchema>;
