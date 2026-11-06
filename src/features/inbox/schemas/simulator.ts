import { z } from "zod";
import { MAX_BODY_CHARS, MAX_SUBJECT_CHARS } from "@/agent/llm/limits";

/** What the simulator form submits. Unlike the webhook, an empty body makes no sense here. */
export const simulatorEmailSchema = z.strictObject({
  from: z.email().max(200),
  subject: z.string().trim().max(MAX_SUBJECT_CHARS),
  body: z.string().trim().min(1).max(MAX_BODY_CHARS),
});

export type SimulatorEmail = z.infer<typeof simulatorEmailSchema>;
