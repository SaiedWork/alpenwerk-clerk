import { z } from "zod";
import type { Intent } from "@/agent/rules/types";

/** Bump whenever the extraction schema changes; it is part of the cache key. */
export const SCHEMA_VERSION = "1";

const INTENTS = [
  "address_change",
  "bank_change",
  "termination",
  "other",
] as const satisfies readonly Intent[];

// A field the email does not state is `null` (a missing key counts as `null` too).
const nullableText = z.string().nullable().default(null);

const common = {
  intents: z.array(z.enum(INTENTS)).min(1),
  confidence: z.number().min(0).max(1),
  language: z.enum(["de", "en", "other"]),
  policy_no: nullableText,
  sender_name: nullableText,
  // Dates are copied as written in the email; normalization parses them.
  date_of_birth: nullableText,
};

const addressChange = z.strictObject({
  ...common,
  primary_intent: z.literal("address_change"),
  strasse: nullableText,
  hausnr: nullableText,
  plz: nullableText,
  ort: nullableText,
  land: nullableText,
  effective_date: nullableText,
});

const bankChange = z.strictObject({
  ...common,
  primary_intent: z.literal("bank_change"),
  iban: nullableText,
  account_holder: nullableText,
  effective_date: nullableText,
});

const termination = z.strictObject({
  ...common,
  primary_intent: z.literal("termination"),
  requested_termination_date: nullableText,
  reason: nullableText,
});

const other = z.strictObject({
  ...common,
  primary_intent: z.literal("other"),
  summary: nullableText,
});

/** Validation gate for the model output. Anything that does not parse never reaches the rules. */
export const extractionSchema = z.discriminatedUnion("primary_intent", [
  addressChange,
  bankChange,
  termination,
  other,
]);

export type Extraction = z.infer<typeof extractionSchema>;
