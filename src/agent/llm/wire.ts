import { z } from "zod";
import { extractionSchema } from "./schema";

// What we ask the provider for: one flat object, every key required, unknown values `null`.
// Provider-side structured output is most reliable without a top-level union and without optional
// keys. The strict discriminated union in `schema.ts` stays the gate in front of the rules.
const text = z.string().nullable();

export const wireSchema = z.object({
  intents: z.array(
    z.enum(["address_change", "bank_change", "termination", "other"]),
  ),
  primary_intent: z.enum([
    "address_change",
    "bank_change",
    "termination",
    "other",
  ]),
  confidence: z.number(),
  language: z.enum(["de", "en", "other"]),
  policy_no: text,
  sender_name: text,
  date_of_birth: text,
  strasse: text,
  hausnr: text,
  plz: text,
  ort: text,
  land: text,
  iban: text,
  account_holder: text,
  effective_date: text,
  requested_termination_date: text,
  reason: text,
  summary: text,
});

export type WireExtraction = z.infer<typeof wireSchema>;

/** Fields that belong to each primary intent; everything else on the wire object is dropped. */
const FIELDS_BY_INTENT = {
  address_change: ["strasse", "hausnr", "plz", "ort", "land", "effective_date"],
  bank_change: ["iban", "account_holder", "effective_date"],
  termination: ["requested_termination_date", "reason"],
  other: ["summary"],
} as const satisfies Record<
  WireExtraction["primary_intent"],
  readonly (keyof WireExtraction)[]
>;

/**
 * Keeps only the common fields and those of the primary intent, then validates against the strict
 * union. Fields the model filled for other intents are ignored: the rules only act on the primary one.
 */
export function wireToExtraction(wire: WireExtraction) {
  const candidate: Record<string, unknown> = {
    intents: wire.intents,
    primary_intent: wire.primary_intent,
    confidence: wire.confidence,
    language: wire.language,
    policy_no: wire.policy_no,
    sender_name: wire.sender_name,
    date_of_birth: wire.date_of_birth,
  };
  for (const key of FIELDS_BY_INTENT[wire.primary_intent]) {
    candidate[key] = wire[key];
  }
  return extractionSchema.safeParse(candidate);
}
