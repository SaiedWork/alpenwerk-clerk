import { describe, expect, it } from "vitest";
import { generalRules } from "@/agent/rules/general";
import { terminationRules } from "@/agent/rules/termination";
import type { Intent } from "@/agent/rules/types";
import { input, snapshot } from "./fixtures";

describe("terminationRules", () => {
  it("always raises TERM_ALWAYS_REVIEW (T01)", () => {
    const codes = terminationRules(input({ primaryIntent: "termination" })).map(
      (r) => r.code,
    );
    expect(codes).toEqual(["TERM_ALWAYS_REVIEW"]);
  });

  it("adds TERM_IRREVOCABLE_BENEFICIARY (T02)", () => {
    const results = terminationRules(
      input({
        primaryIntent: "termination",
        snapshot: { ...snapshot, irrevocableBeneficiary: true },
      }),
    );
    expect(results.map((r) => r.code)).toEqual([
      "TERM_ALWAYS_REVIEW",
      "TERM_IRREVOCABLE_BENEFICIARY",
    ]);
    expect(results.every((r) => r.severity === "escalate")).toBe(true);
  });
});

describe("generalRules", () => {
  const codes = (intents: Intent[], primary: Intent, confidence = 0.95) =>
    generalRules(input({ intents, primaryIntent: primary, confidence })).map(
      (r) => r.code,
    );

  it.each<[string, Intent[], Intent, number, string[]]>([
    ["single bank change", ["bank_change"], "bank_change", 0.95, []],
    [
      "bank + address (B07)",
      ["bank_change", "address_change"],
      "bank_change",
      0.9,
      ["MULTI_INTENT_RISK"],
    ],
    [
      "address first, bank second",
      ["address_change", "bank_change"],
      "address_change",
      0.9,
      ["MULTI_INTENT_RISK"],
    ],
    [
      "address + termination, no bank",
      ["address_change", "termination"],
      "address_change",
      0.9,
      [],
    ],
    ["intent other (X01)", ["other"], "other", 0.9, ["OTHER_INTENT"]],
    ["confidence exactly 0.6", ["address_change"], "address_change", 0.6, []],
    [
      "confidence below 0.6",
      ["address_change"],
      "address_change",
      0.59,
      ["OTHER_INTENT"],
    ],
  ])("%s", (_name, intents, primary, confidence, expected) => {
    expect(codes(intents, primary, confidence)).toEqual(expected);
  });
});
