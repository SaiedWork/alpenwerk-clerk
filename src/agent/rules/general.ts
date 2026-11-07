import { ruleResult } from "./result";
import type { RuleInput, RuleResult } from "./types";

const MIN_CONFIDENCE = 0.6;

/** Rules that do not belong to one intent. */
export function generalRules(input: RuleInput): RuleResult[] {
  const results: RuleResult[] = [];
  // A bank change next to any other request is a classic fraud pattern.
  if (
    input.intents.includes("bank_change") &&
    input.intents.some((intent) => intent !== "bank_change")
  ) {
    results.push(ruleResult("MULTI_INTENT_RISK", "escalate"));
  }
  if (input.primaryIntent === "other" || input.confidence < MIN_CONFIDENCE) {
    results.push(ruleResult("OTHER_INTENT", "escalate"));
  }
  return results;
}
