import { namesMatch } from "@/lib/normalize";
import { ruleResult as result } from "./result";
import type { RuleInput, RuleResult } from "./types";

const sameEmail = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Identification rules. Without a policy snapshot only ID_POLICY_NOT_FOUND applies,
 * because there is nothing to compare against. The exception is intent `other`: it always
 * goes to a human, and spam or a complaint often has no policy number, so a missing
 * snapshot is not a block there. A missing name or birth date in the email
 * is not a mismatch: the rules only compare what the customer actually stated.
 */
export function identifyRules(input: RuleInput): RuleResult[] {
  const { snapshot, identity, senderEmail } = input;
  if (!snapshot) {
    return input.primaryIntent === "other"
      ? []
      : [result("ID_POLICY_NOT_FOUND", "block")];
  }

  const results: RuleResult[] = [];

  const fullName = `${snapshot.firstName} ${snapshot.lastName}`;
  if (identity.senderName && !namesMatch(identity.senderName, fullName)) {
    results.push(result("ID_NAME_MISMATCH", "escalate"));
  }
  // A birth date that is not in the normalized ISO form also differs, which is the safe side.
  if (identity.dateOfBirth && identity.dateOfBirth !== snapshot.dateOfBirth) {
    results.push(result("ID_DOB_MISMATCH", "escalate"));
  }
  if (snapshot.status !== "aktiv") {
    results.push(result("ID_POLICY_INACTIVE", "escalate"));
  }
  if (!sameEmail(senderEmail, snapshot.email)) {
    results.push(result("ID_SENDER_UNKNOWN", "escalate"));
  }
  return results;
}
