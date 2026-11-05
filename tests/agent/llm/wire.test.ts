import { describe, expect, it } from "vitest";
import { z } from "zod";
import { wireSchema, wireToExtraction } from "@/agent/llm/wire";

describe("wireSchema", () => {
  it("is a flat object with every key required (no union, no optional keys)", () => {
    const json = z.toJSONSchema(wireSchema, { io: "input" });
    expect(json.type).toBe("object");
    expect(json).not.toHaveProperty("anyOf");
    expect(json.required).toEqual(Object.keys(json.properties ?? {}));
  });
});

describe("wireToExtraction", () => {
  const wire = z.parse(wireSchema, {
    intents: ["termination"],
    primary_intent: "termination",
    confidence: 0.8,
    language: "en",
    policy_no: null,
    sender_name: null,
    date_of_birth: null,
    strasse: "ignored",
    hausnr: null,
    plz: null,
    ort: null,
    land: null,
    iban: "ignored",
    account_holder: null,
    effective_date: null,
    requested_termination_date: "31.12.2026",
    reason: null,
    summary: "ignored",
  });

  it("keeps common and primary-intent fields only", () => {
    const result = wireToExtraction(wire);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      intents: ["termination"],
      primary_intent: "termination",
      confidence: 0.8,
      language: "en",
      policy_no: null,
      sender_name: null,
      date_of_birth: null,
      requested_termination_date: "31.12.2026",
      reason: null,
    });
  });
});
