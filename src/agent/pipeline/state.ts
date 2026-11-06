import { z } from "zod";
import type { NormalizedExtraction } from "@/agent/llm/normalize";
import type { NormalizedParams } from "@/agent/rules/engine";
import type { LegacySnapshot } from "@/agent/rules/types";
import type { PipelineState, StoredEvent } from "./types";

// Event payloads are the hand-off between steps, so they are re-validated when read back.

const intent = z.enum([
  "address_change",
  "bank_change",
  "termination",
  "other",
]);

const normalizedExtractionSchema = z.object({
  policyNo: z.string().nullable(),
  language: z.enum(["de", "en", "other"]),
  intents: z.array(intent),
  primaryIntent: intent,
  confidence: z.number(),
  identity: z.object({
    senderName: z.string().nullable(),
    dateOfBirth: z.string().nullable(),
  }),
  address: z
    .object({
      street: z.string().nullable(),
      houseNo: z.string().nullable(),
      plz: z.string().nullable(),
      city: z.string().nullable(),
      country: z.string().nullable(),
    })
    .nullable(),
  bank: z
    .object({
      iban: z.string().nullable(),
      accountHolder: z.string().nullable(),
    })
    .nullable(),
  effectiveDate: z.string().nullable(),
  termination: z
    .object({
      requestedDate: z.string().nullable(),
      reason: z.string().nullable(),
    })
    .nullable(),
  summary: z.string().nullable(),
}) satisfies z.ZodType<NormalizedExtraction>;

const snapshotSchema = z.object({
  policyNo: z.string(),
  status: z.enum(["aktiv", "ruhend", "storniert"]),
  firstName: z.string(),
  lastName: z.string(),
  dateOfBirth: z.string(),
  email: z.string(),
  activeMandate: z.object({ iban: z.string(), holder: z.string() }).nullable(),
  // JSON turns the Date into an ISO string.
  lastAddressChangeAt: z.coerce.date().nullable(),
  irrevocableBeneficiary: z.boolean(),
  surrenderValueIndicative: z.number().nullable(),
}) satisfies z.ZodType<LegacySnapshot>;

const addressPartsSchema = z.object({
  street: z.string().nullable(),
  houseNo: z.string().nullable(),
  plz: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
});

const normalizedParamsSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("address_change"), address: addressPartsSchema }),
  z.object({
    kind: z.literal("bank_change"),
    iban: z.string(),
    accountHolder: z.string().nullable(),
  }),
  z.object({
    kind: z.literal("termination"),
    indicativeEffectiveDate: z.string(),
    surrenderValueIndicative: z.number().nullable(),
    irrevocableBeneficiary: z.boolean(),
  }),
]) satisfies z.ZodType<NormalizedParams>;

export const evaluatePayloadSchema = z.object({
  decision: z.enum(["AUTO_EXECUTE", "NEEDS_REVIEW", "REPLY_ONLY"]),
  normalizedParams: normalizedParamsSchema.nullable(),
});

export const analyzePayloadSchema = z.object({
  extraction: normalizedExtractionSchema,
  source: z.enum(["cache", "live"]),
  model: z.string(),
});

export const identifyPayloadSchema = z.object({
  snapshot: snapshotSchema.nullable(),
});

const executePayloadSchema = z.union([
  z.object({
    kind: z.enum(["address_change", "bank_change"]),
    outcome: z.string(),
  }),
  z.object({ reason: z.string() }),
]);

export class PipelineStateError extends Error {
  readonly code = "STATE_INVALID";
  constructor(step: string) {
    super(`Stored payload of step "${step}" is invalid`);
    this.name = "PipelineStateError";
  }
}

/** Rebuilds the state from the done events. An unreadable payload is an error, never a guess. */
export function stateFromEvents(done: StoredEvent[]): PipelineState {
  const state: PipelineState = {};
  for (const event of done) {
    if (event.step === "analyze") {
      const parsed = analyzePayloadSchema.safeParse(event.payload);
      if (!parsed.success) throw new PipelineStateError("analyze");
      state.extraction = parsed.data.extraction;
    } else if (event.step === "identify") {
      const parsed = identifyPayloadSchema.safeParse(event.payload);
      if (!parsed.success) throw new PipelineStateError("identify");
      state.snapshot = parsed.data.snapshot;
    } else if (event.step === "evaluate") {
      const parsed = evaluatePayloadSchema.safeParse(event.payload);
      if (!parsed.success) throw new PipelineStateError("evaluate");
      state.evaluation = parsed.data;
    } else if (event.step === "execute") {
      if (!executePayloadSchema.safeParse(event.payload).success) {
        throw new PipelineStateError("execute");
      }
      // A skipped execute wrote nothing, so there is nothing to verify.
      state.executed = event.status === "succeeded";
    }
  }
  return state;
}
