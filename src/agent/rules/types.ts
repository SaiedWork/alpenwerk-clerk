// Types of the rule engine. Everything here is plain data: the agent never imports legacy
// types, it only receives a snapshot that was read through the browser (see executor/).

export type Intent = "address_change" | "bank_change" | "termination" | "other";

export type Decision = "AUTO_EXECUTE" | "NEEDS_REVIEW" | "REPLY_ONLY";

export type Severity = "block" | "escalate" | "info";

export type IdentifyRuleCode =
  | "ID_POLICY_NOT_FOUND"
  | "ID_NAME_MISMATCH"
  | "ID_DOB_MISMATCH"
  | "ID_POLICY_INACTIVE"
  | "ID_SENDER_UNKNOWN";

/** Grows with every rule group (address, bank, termination, general). */
export type RuleCode = IdentifyRuleCode;

/** One rule outcome. `messageDe` is the German explanation shown in the console. */
export interface RuleResult {
  code: RuleCode;
  severity: Severity;
  messageDe: string;
}

export type PolicyStatus = "aktiv" | "ruhend" | "storniert";

/** What the identify step read from the legacy system for one policy. */
export interface LegacySnapshot {
  policyNo: string;
  status: PolicyStatus;
  firstName: string;
  lastName: string;
  /** `YYYY-MM-DD` */
  dateOfBirth: string;
  email: string;
}

/** Normalized, Zod-validated values from the LLM. `null` means "not present in the email". */
export interface ExtractedIdentity {
  senderName: string | null;
  /** `YYYY-MM-DD` */
  dateOfBirth: string | null;
}

export interface RuleInput {
  /** All intents detected in the email; `primaryIntent` is the one acted on. */
  intents: Intent[];
  primaryIntent: Intent;
  confidence: number;
  identity: ExtractedIdentity;
  senderEmail: string;
  /** `null` when the policy number is absent in the legacy system. */
  snapshot: LegacySnapshot | null;
  now: Date;
}
