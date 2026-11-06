import type { Decision, Intent, RuleCode } from "@/agent/rules/types";
import type { TemplateKey } from "./render";

export interface ReplyCase {
  decision: Decision;
  intent: Intent;
  reasonCodes: readonly string[];
  /** The browser really wrote the change (execute ended `succeeded`, not `skipped`). */
  executed: boolean;
  /** What a human did with a `NEEDS_REVIEW` case. */
  review: "none" | "approved" | "rejected";
}

// Order matters when several block codes occur: the most fundamental problem is answered.
const REPLY_ONLY_PRIORITY: [RuleCode, TemplateKey][] = [
  ["ID_POLICY_NOT_FOUND", "unknown_policy"],
  ["BANK_SAME_IBAN", "bank_same_iban"],
  ["ADDR_INCOMPLETE", "request_missing_info"],
  ["ADDR_PLZ_INVALID", "request_missing_info"],
  ["BANK_IBAN_INVALID", "request_missing_info"],
];

/**
 * Chooses the reply template for a finished case. Pure. A confirmation is only chosen when the
 * change was really written; anything unclear gets the neutral acknowledgment.
 */
export function selectTemplate(c: ReplyCase): TemplateKey {
  if (c.review === "rejected") return "rejected_by_reviewer";

  if (c.decision === "REPLY_ONLY") {
    for (const [code, key] of REPLY_ONLY_PRIORITY) {
      if (c.reasonCodes.includes(code)) return key;
    }
    return "escalated_ack";
  }

  if (c.executed) {
    if (c.intent === "address_change") return "address_confirmed";
    if (c.intent === "bank_change") return "bank_confirmed";
  }
  if (c.intent === "termination") return "termination_received";
  return "escalated_ack";
}
