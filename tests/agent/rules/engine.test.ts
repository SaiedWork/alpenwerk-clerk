import { describe, expect, it } from "vitest";
import { evaluate } from "@/agent/rules/engine";
import type {
  ExtractedAddress,
  ExtractedBank,
  Intent,
  LegacySnapshot,
  RuleCode,
  RuleInput,
} from "@/agent/rules/types";
import { t } from "@/lib/i18n-de";
import { input, NOW, snapshot } from "./fixtures";

// Rule-level preview of the §14 eval matrix (the real evals add the LLM in front).

const goodAddress: ExtractedAddress = {
  street: "Neue Straße",
  houseNo: "7a",
  plz: "50667",
  city: "Köln",
  country: null,
};
const goodBank: ExtractedBank = {
  iban: "DE89370400440532013000",
  accountHolder: "Anna Müller-Schmidt",
};

const address = (a: Partial<ExtractedAddress> = {}): Partial<RuleInput> => ({
  intents: ["address_change"],
  primaryIntent: "address_change",
  address: { ...goodAddress, ...a },
});
const bank = (
  b: Partial<ExtractedBank> = {},
  more: Intent[] = [],
): Partial<RuleInput> => ({
  intents: ["bank_change", ...more],
  primaryIntent: "bank_change",
  bank: { ...goodBank, ...b },
});
const snap = (s: Partial<LegacySnapshot>) => ({
  snapshot: { ...snapshot, ...s },
});
const termination: Partial<RuleInput> = {
  intents: ["termination"],
  primaryIntent: "termination",
};

type Row = [string, Partial<RuleInput>, string, RuleCode[]];

const matrix: Row[] = [
  ["B01 clean bank change", bank(), "AUTO_EXECUTE", []],
  [
    "B02 lowercase spaced IBAN",
    bank({ iban: "de89 3704 0044 0532 0130 00" }),
    "AUTO_EXECUTE",
    [],
  ],
  [
    "B03 IBAN checksum",
    bank({ iban: "DE89370400440532013001" }),
    "REPLY_ONLY",
    ["BANK_IBAN_INVALID"],
  ],
  [
    "B04 spouse as holder",
    bank({ accountHolder: "Peter Müller-Schmidt" }),
    "NEEDS_REVIEW",
    ["BANK_HOLDER_MISMATCH"],
  ],
  [
    "B05 no mandate",
    { ...bank(), ...snap({ activeMandate: null }) },
    "NEEDS_REVIEW",
    ["BANK_NO_MANDATE"],
  ],
  [
    "B06 non-DE IBAN",
    bank({ iban: "GB82WEST12345698765432" }),
    "NEEDS_REVIEW",
    ["BANK_NON_DE"],
  ],
  [
    "B07 bank + address",
    bank({}, ["address_change"]),
    "NEEDS_REVIEW",
    ["MULTI_INTENT_RISK"],
  ],
  [
    "B08 recent address change",
    {
      ...bank(),
      ...snap({
        lastAddressChangeAt: new Date(NOW.getTime() - 5 * 86_400_000),
      }),
    },
    "NEEDS_REVIEW",
    ["BANK_RECENT_ADDRESS_CHANGE"],
  ],
  ["A01 clean address", address(), "AUTO_EXECUTE", []],
  [
    "A02 missing house number",
    address({ houseNo: null }),
    "REPLY_ONLY",
    ["ADDR_INCOMPLETE"],
  ],
  [
    "A03 4-digit PLZ",
    address({ plz: "5066" }),
    "REPLY_ONLY",
    ["ADDR_PLZ_INVALID"],
  ],
  [
    "A04 moving to Spain",
    address({ plz: "28013", country: "Spanien" }),
    "NEEDS_REVIEW",
    ["ADDR_NON_DE"],
  ],
  ["A05 mixed order, typos", address({ plz: " 50667" }), "AUTO_EXECUTE", []],
  [
    "I01 unknown policy",
    { ...address(), snapshot: null },
    "REPLY_ONLY",
    ["ID_POLICY_NOT_FOUND"],
  ],
  [
    "I02 name differs",
    {
      ...address(),
      identity: { senderName: "Peter Meier", dateOfBirth: null },
    },
    "NEEDS_REVIEW",
    ["ID_NAME_MISMATCH"],
  ],
  [
    "I03 policy ruhend",
    { ...address(), ...snap({ status: "ruhend" }) },
    "NEEDS_REVIEW",
    ["ID_POLICY_INACTIVE"],
  ],
  [
    "I04 sender email differs",
    { ...address(), senderEmail: "other@example.test" },
    "NEEDS_REVIEW",
    ["ID_SENDER_UNKNOWN"],
  ],
  ["T01 termination", termination, "NEEDS_REVIEW", ["TERM_ALWAYS_REVIEW"]],
  [
    "T02 irrevocable beneficiary",
    { ...termination, ...snap({ irrevocableBeneficiary: true }) },
    "NEEDS_REVIEW",
    ["TERM_ALWAYS_REVIEW", "TERM_IRREVOCABLE_BENEFICIARY"],
  ],
  [
    "T03 unsure about terminating",
    { intents: ["other"], primaryIntent: "other" },
    "NEEDS_REVIEW",
    ["OTHER_INTENT"],
  ],
  [
    "X01 complaint",
    { intents: ["other"], primaryIntent: "other" },
    "NEEDS_REVIEW",
    ["OTHER_INTENT"],
  ],
  [
    "X02 injection + holder mismatch",
    bank({ accountHolder: "Fremder Dritter" }),
    "NEEDS_REVIEW",
    ["BANK_HOLDER_MISMATCH"],
  ],
  ["X03 English bank change", bank(), "AUTO_EXECUTE", []],
  [
    "X04 spam, low confidence",
    {
      intents: ["other"],
      primaryIntent: "other",
      confidence: 0.1,
      identity: { senderName: null, dateOfBirth: null },
    },
    "NEEDS_REVIEW",
    ["OTHER_INTENT"],
  ],
];

describe("evaluate: rule-level eval matrix", () => {
  it.each(matrix)("%s", (_name, overrides, decision, reasonCodes) => {
    const result = evaluate(input(overrides));
    expect(result.decision).toBe(decision);
    expect(result.reasonCodes).toEqual(reasonCodes);
  });
});

describe("evaluate: intent other without a policy", () => {
  it("X04 spam with no policy number is reviewed, not replied to", () => {
    const result = evaluate(
      input({
        snapshot: null,
        intents: ["other"],
        primaryIntent: "other",
        confidence: 0.1,
        identity: { senderName: null, dateOfBirth: null },
      }),
    );
    expect(result.decision).toBe("NEEDS_REVIEW");
    expect(result.reasonCodes).toEqual(["OTHER_INTENT"]);
  });
});

describe("evaluate: normalizedParams", () => {
  it("is null for REPLY_ONLY so a blocked case never reaches the executor", () => {
    expect(
      evaluate(input(address({ houseNo: null }))).normalizedParams,
    ).toBeNull();
  });

  it("carries the validated address for AUTO_EXECUTE", () => {
    expect(evaluate(input(address())).normalizedParams).toEqual({
      kind: "address_change",
      address: goodAddress,
    });
  });

  it("carries the normalized IBAN for a bank change", () => {
    const params = evaluate(
      input(bank({ iban: "de89 3704 0044 0532 0130 00" })),
    ).normalizedParams;
    expect(params).toEqual({
      kind: "bank_change",
      iban: "DE89370400440532013000",
      accountHolder: "Anna Müller-Schmidt",
    });
  });

  it("prepares the termination review: month end in Berlin and surrender value", () => {
    expect(evaluate(input(termination)).normalizedParams).toEqual({
      kind: "termination",
      indicativeEffectiveDate: "2026-11-30",
      surrenderValueIndicative: 12450.5,
      irrevocableBeneficiary: false,
    });
  });

  it("is null for intent other", () => {
    expect(
      evaluate(input({ intents: ["other"], primaryIntent: "other" }))
        .normalizedParams,
    ).toBeNull();
  });
});

describe("rule explanations", () => {
  it("every rule code used by the engine has a German message", () => {
    for (const [, overrides] of matrix) {
      for (const r of evaluate(input(overrides)).results) {
        expect(t.rules[r.code]).toBe(r.messageDe);
        expect(r.messageDe.length).toBeGreaterThan(10);
      }
    }
  });
});
