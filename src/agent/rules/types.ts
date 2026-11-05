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

export type AddressRuleCode =
  "ADDR_INCOMPLETE" | "ADDR_PLZ_INVALID" | "ADDR_NON_DE";

export type BankRuleCode =
  | "BANK_IBAN_INVALID"
  | "BANK_NON_DE"
  | "BANK_HOLDER_MISMATCH"
  | "BANK_NO_MANDATE"
  | "BANK_SAME_IBAN"
  | "BANK_RECENT_ADDRESS_CHANGE";

export type TerminationRuleCode =
  "TERM_ALWAYS_REVIEW" | "TERM_IRREVOCABLE_BENEFICIARY";

export type GeneralRuleCode = "MULTI_INTENT_RISK" | "OTHER_INTENT";

export type RuleCode =
  | IdentifyRuleCode
  | AddressRuleCode
  | BankRuleCode
  | TerminationRuleCode
  | GeneralRuleCode;

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
  /** Active SEPA mandate, `null` if there is none. */
  activeMandate: { iban: string; holder: string } | null;
  /** Time of the latest address change in the change log, `null` if never changed. */
  lastAddressChangeAt: Date | null;
  irrevocableBeneficiary: boolean;
  /** Indicative surrender value in EUR as shown in the legacy system, `null` if unknown. */
  surrenderValueIndicative: number | null;
}

/** Normalized, Zod-validated values from the LLM. `null` means "not present in the email". */
export interface ExtractedIdentity {
  senderName: string | null;
  /** `YYYY-MM-DD` */
  dateOfBirth: string | null;
}

/** Address as stated in the email, trimmed; `null` for anything missing. */
export interface ExtractedAddress {
  street: string | null;
  houseNo: string | null;
  plz: string | null;
  city: string | null;
  country: string | null;
}

/** Bank data as stated in the email. The IBAN is already normalized (no spaces, uppercase). */
export interface ExtractedBank {
  iban: string | null;
  accountHolder: string | null;
}

export interface RuleInput {
  /** All intents detected in the email; `primaryIntent` is the one acted on. */
  intents: Intent[];
  primaryIntent: Intent;
  confidence: number;
  identity: ExtractedIdentity;
  /** Only set for `address_change` / `bank_change` respectively. */
  address: ExtractedAddress | null;
  bank: ExtractedBank | null;
  senderEmail: string;
  /** `null` when the policy number is absent in the legacy system. */
  snapshot: LegacySnapshot | null;
  now: Date;
}
