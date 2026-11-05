import type { Decision, Intent, RuleResult } from "./types";

// Intents that are never executed without a human, whatever the rules say.
const ALWAYS_REVIEWED: ReadonlySet<Intent> = new Set(["termination", "other"]);

/**
 * Reduces rule results to one decision:
 * any block -> REPLY_ONLY; else any escalate -> NEEDS_REVIEW;
 * else termination/other -> NEEDS_REVIEW (forced); else AUTO_EXECUTE.
 */
export function decide(results: RuleResult[], intent: Intent): Decision {
  if (results.some((r) => r.severity === "block")) return "REPLY_ONLY";
  if (results.some((r) => r.severity === "escalate")) return "NEEDS_REVIEW";
  if (ALWAYS_REVIEWED.has(intent)) return "NEEDS_REVIEW";
  return "AUTO_EXECUTE";
}
