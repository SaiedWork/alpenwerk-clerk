import { endOfMonthBerlinIso } from "@/lib/dates";
import { normalizeIban } from "@/lib/iban";
import { addressRules } from "./address";
import { bankRules } from "./bank";
import { decide } from "./decide";
import { generalRules } from "./general";
import { identifyRules } from "./identify";
import { terminationRules } from "./termination";
import type {
  Decision,
  ExtractedAddress,
  RuleCode,
  RuleInput,
  RuleResult,
} from "./types";

/**
 * Parameters for later steps, built only from validated, normalized values.
 * `null` whenever the decision is REPLY_ONLY: a blocked case can never reach the executor.
 */
export type NormalizedParams =
  | { kind: "address_change"; address: ExtractedAddress }
  | { kind: "bank_change"; iban: string; accountHolder: string | null }
  | {
      kind: "termination";
      /** Demo rule: end of the month of receipt (Berlin). */
      indicativeEffectiveDate: string;
      surrenderValueIndicative: number | null;
      irrevocableBeneficiary: boolean;
    };

export interface Evaluation {
  decision: Decision;
  reasonCodes: RuleCode[];
  results: RuleResult[];
  normalizedParams: NormalizedParams | null;
}

function buildParams(input: RuleInput): NormalizedParams | null {
  const { snapshot, primaryIntent } = input;
  if (primaryIntent === "address_change" && input.address) {
    return { kind: "address_change", address: input.address };
  }
  if (primaryIntent === "bank_change" && input.bank?.iban) {
    return {
      kind: "bank_change",
      iban: normalizeIban(input.bank.iban),
      accountHolder: input.bank.accountHolder,
    };
  }
  if (primaryIntent === "termination" && snapshot) {
    return {
      kind: "termination",
      indicativeEffectiveDate: endOfMonthBerlinIso(input.now),
      surrenderValueIndicative: snapshot.surrenderValueIndicative,
      irrevocableBeneficiary: snapshot.irrevocableBeneficiary,
    };
  }
  return null;
}

/** Runs all applicable rule groups and reduces them to one decision. Pure. */
export function evaluate(input: RuleInput): Evaluation {
  const results = [
    ...identifyRules(input),
    ...(input.primaryIntent === "address_change" ? addressRules(input) : []),
    ...(input.primaryIntent === "bank_change" ? bankRules(input) : []),
    ...(input.primaryIntent === "termination" ? terminationRules(input) : []),
    ...generalRules(input),
  ];
  const decision = decide(results, input.primaryIntent);
  return {
    decision,
    reasonCodes: results.map((r) => r.code),
    results,
    normalizedParams: decision === "REPLY_ONLY" ? null : buildParams(input),
  };
}
