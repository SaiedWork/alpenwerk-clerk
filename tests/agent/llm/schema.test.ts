import { describe, expect, it } from "vitest";
import { extractionSchema } from "@/agent/llm/schema";

const common = {
  intents: ["bank_change"],
  confidence: 0.9,
  language: "de",
};

describe("extractionSchema", () => {
  it("accepts a bank change and defaults missing optional fields to null", () => {
    const parsed = extractionSchema.parse({
      ...common,
      primary_intent: "bank_change",
      iban: "DE89 3704 0044 0532 0130 00",
    });
    expect(parsed).toMatchObject({
      primary_intent: "bank_change",
      account_holder: null,
      policy_no: null,
      effective_date: null,
    });
  });

  it.each([
    [
      "address_change",
      { strasse: "Hauptstr.", hausnr: "5", plz: "50667", ort: "Köln" },
    ],
    ["termination", { requested_termination_date: "31.12.2026" }],
    ["other", { summary: "Beschwerde über Wartezeit" }],
  ])("accepts %s", (intent, fields) => {
    expect(
      extractionSchema.safeParse({
        ...common,
        intents: [intent],
        primary_intent: intent,
        ...fields,
      }).success,
    ).toBe(true);
  });

  it.each([
    ["confidence above 1", { confidence: 1.2 }],
    ["confidence below 0", { confidence: -0.1 }],
    ["confidence as string", { confidence: "high" }],
    ["unknown primary intent", { primary_intent: "refund" }],
    ["unknown intent in list", { intents: ["bank_change", "refund"] }],
    ["empty intents", { intents: [] }],
    ["unknown language", { language: "fr" }],
    ["extra key", { decision: "AUTO_EXECUTE" }],
    ["field of another intent", { strasse: "Hauptstr." }],
    ["non-string IBAN", { iban: 123 }],
  ])("rejects %s", (_name, override) => {
    expect(
      extractionSchema.safeParse({
        ...common,
        primary_intent: "bank_change",
        iban: null,
        ...override,
      }).success,
    ).toBe(false);
  });

  it("rejects a missing discriminator", () => {
    expect(extractionSchema.safeParse(common).success).toBe(false);
  });
});
