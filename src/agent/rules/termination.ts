import { ruleResult } from "./result";
import type { RuleInput, RuleResult } from "./types";

/**
 * Termination rules. A termination is irreversible and has financial impact, so it is never
 * executed by the clerk: TERM_ALWAYS_REVIEW is raised every time, and the irrevocable
 * beneficiary adds the hint that a third party must consent.
 */
export function terminationRules(input: RuleInput): RuleResult[] {
  const results = [ruleResult("TERM_ALWAYS_REVIEW", "escalate")];
  if (input.snapshot?.irrevocableBeneficiary) {
    results.push(ruleResult("TERM_IRREVOCABLE_BENEFICIARY", "escalate"));
  }
  return results;
}
