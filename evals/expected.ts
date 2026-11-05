import type { NormalizedExtraction } from "@/agent/llm/normalize";
import type { EvalCase } from "./schema";

/**
 * The extraction a perfect model would return for this case, built from the labels. Feeding it
 * to the rule engine checks that the labels are reachable without any LLM involved.
 */
export function expectedExtraction(c: EvalCase): NormalizedExtraction {
  const f = c.expectedFields;
  const { intent } = c.expected;
  return {
    policyNo: f.policyNo ?? null,
    language: "de",
    intents: c.expected.intents ?? [intent],
    primaryIntent: intent,
    confidence: 0.95,
    identity: {
      senderName: f.senderName ?? null,
      dateOfBirth: f.dateOfBirth ?? null,
    },
    address:
      intent === "address_change"
        ? {
            street: f.street ?? null,
            houseNo: f.houseNo ?? null,
            plz: f.plz ?? null,
            city: f.city ?? null,
            country: f.country ?? null,
          }
        : null,
    bank:
      intent === "bank_change"
        ? { iban: f.iban ?? null, accountHolder: f.accountHolder ?? null }
        : null,
    effectiveDate: null,
    termination:
      intent === "termination" ? { requestedDate: null, reason: null } : null,
    summary: null,
  };
}
