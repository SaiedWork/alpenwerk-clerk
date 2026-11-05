import { computeCacheKey } from "@/agent/llm/cache-key";
import type { Extraction } from "@/agent/llm/schema";
import type { SeedCacheEntry } from "@/agent/llm/seed-file";
import type { EvalCase } from "../../evals/schema";

/** The raw model output a perfect model would give for this case (inverse of normalization). */
export function perfectRaw(c: EvalCase): Extraction {
  const f = c.expectedFields;
  const common = {
    intents: c.expected.intents ?? [c.expected.intent],
    confidence: 0.95,
    language: "de" as const,
    policy_no: f.policyNo ?? null,
    sender_name: f.senderName ?? null,
    date_of_birth: f.dateOfBirth ?? null,
  };
  switch (c.expected.intent) {
    case "address_change":
      return {
        ...common,
        primary_intent: "address_change",
        strasse: f.street ?? null,
        hausnr: f.houseNo ?? null,
        plz: f.plz ?? null,
        ort: f.city ?? null,
        land: f.country ?? null,
        effective_date: null,
      };
    case "bank_change":
      return {
        ...common,
        primary_intent: "bank_change",
        iban: f.iban ?? null,
        account_holder: f.accountHolder ?? null,
        effective_date: null,
      };
    case "termination":
      return {
        ...common,
        primary_intent: "termination",
        requested_termination_date: null,
        reason: null,
      };
    case "other":
      return { ...common, primary_intent: "other", summary: null };
  }
}

export function cacheEntry(c: EvalCase, response: unknown): SeedCacheEntry {
  return {
    key: computeCacheKey(c.email.subject, c.email.body),
    response,
    model: "perfect",
  };
}

export function perfectEntries(cases: EvalCase[]): SeedCacheEntry[] {
  return cases.map((c) => cacheEntry(c, perfectRaw(c)));
}
