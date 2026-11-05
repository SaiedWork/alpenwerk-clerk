import { z } from "zod";
import { MAX_BODY_CHARS, MAX_SUBJECT_CHARS } from "@/agent/llm/limits";
import type { RuleCode } from "@/agent/rules/types";

const RULE_CODES = [
  "ID_POLICY_NOT_FOUND",
  "ID_NAME_MISMATCH",
  "ID_DOB_MISMATCH",
  "ID_POLICY_INACTIVE",
  "ID_SENDER_UNKNOWN",
  "ADDR_INCOMPLETE",
  "ADDR_PLZ_INVALID",
  "ADDR_NON_DE",
  "BANK_IBAN_INVALID",
  "BANK_NON_DE",
  "BANK_HOLDER_MISMATCH",
  "BANK_NO_MANDATE",
  "BANK_SAME_IBAN",
  "BANK_RECENT_ADDRESS_CHANGE",
  "MULTI_INTENT_RISK",
  "TERM_ALWAYS_REVIEW",
  "TERM_IRREVOCABLE_BENEFICIARY",
  "OTHER_INTENT",
] as const satisfies readonly RuleCode[];

// Compile-time guard: fails if a code is added to `RuleCode` but not to the list above.
type MissingRuleCodes = Exclude<RuleCode, (typeof RULE_CODES)[number]>;
const _allRuleCodesListed: MissingRuleCodes extends never ? true : never = true;
void _allRuleCodesListed;

const intentSchema = z.enum([
  "address_change",
  "bank_change",
  "termination",
  "other",
]);

/**
 * Values the model should extract, in their NORMALIZED form (IBAN without spaces, PLZ digits
 * only, ISO dates). A key that is absent is not scored; `null` means "must be null".
 */
const expectedFieldsSchema = z
  .strictObject({
    policyNo: z.string().nullable(),
    senderName: z.string().nullable(),
    dateOfBirth: z.string().nullable(),
    street: z.string().nullable(),
    houseNo: z.string().nullable(),
    plz: z.string().nullable(),
    city: z.string().nullable(),
    country: z.string().nullable(),
    iban: z.string().nullable(),
    accountHolder: z.string().nullable(),
  })
  .partial();

export const evalCaseSchema = z.strictObject({
  /** Scenario id from the case matrix, e.g. `B01`. The file is named `<id>.json`. */
  id: z.string().regex(/^[A-Z]\d{2}$/),
  /** Seed customer key (`CustomerFixture.key`) the identify step "reads"; `null` = policy not in the legacy system. */
  policyFixture: z.string().min(1).nullable(),
  email: z.strictObject({
    from: z.email(),
    subject: z.string().max(MAX_SUBJECT_CHARS),
    body: z.string().max(MAX_BODY_CHARS),
  }),
  expected: z.strictObject({
    intent: intentSchema,
    /** All intents the model should detect; defaults to `[intent]`. */
    intents: z.array(intentSchema).min(1).optional(),
    decision: z.enum(["AUTO_EXECUTE", "NEEDS_REVIEW", "REPLY_ONLY"]),
    /** Compared as a set; order does not matter. */
    reasonCodes: z.array(z.enum(RULE_CODES)),
  }),
  expectedFields: expectedFieldsSchema.default({}),
  notes: z.string().optional(),
});

export type EvalCase = z.infer<typeof evalCaseSchema>;
export type ExpectedFields = EvalCase["expectedFields"];
