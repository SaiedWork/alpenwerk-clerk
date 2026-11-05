import { describe, expect, it } from "vitest";
import { normalizeExtraction, toRuleInput } from "@/agent/llm/normalize";
import { extractionSchema } from "@/agent/llm/schema";
import { evaluate } from "@/agent/rules/engine";
import { NOW, snapshot } from "../rules/fixtures";

function parse(fields: Record<string, unknown>) {
  return extractionSchema.parse({
    intents: [fields.primary_intent],
    confidence: 0.95,
    language: "de",
    ...fields,
  });
}

const bank = (fields: Record<string, unknown> = {}) =>
  parse({
    primary_intent: "bank_change",
    policy_no: "aw 100101",
    sender_name: "  Anna  Müller-Schmidt ",
    date_of_birth: "12.04.1985",
    iban: "de89 3704 0044 0532 0130 00",
    account_holder: "Anna Müller-Schmidt",
    ...fields,
  });

const address = (fields: Record<string, unknown> = {}) =>
  parse({
    primary_intent: "address_change",
    policy_no: "AW-100101",
    sender_name: "Anna Müller-Schmidt",
    strasse: "Hauptstraße",
    hausnr: "5",
    plz: "50667",
    ort: "Köln",
    ...fields,
  });

const ctx = {
  senderEmail: "anna.mueller@example.test",
  snapshot,
  now: NOW,
};

describe("normalizeExtraction", () => {
  it("normalizes policy number, IBAN, name and German date of birth", () => {
    const n = normalizeExtraction(bank(), NOW);
    expect(n.policyNo).toBe("AW-100101");
    expect(n.bank).toEqual({
      iban: "DE89370400440532013000",
      accountHolder: "Anna Müller-Schmidt",
    });
    expect(n.identity).toEqual({
      senderName: "Anna Müller-Schmidt",
      dateOfBirth: "1985-04-12",
    });
    expect(n.address).toBeNull();
  });

  it("sets address only for address_change and bank only for bank_change", () => {
    const a = normalizeExtraction(address(), NOW);
    expect(a.address).not.toBeNull();
    expect(a.bank).toBeNull();
    const t = normalizeExtraction(
      parse({
        primary_intent: "termination",
        requested_termination_date: "31.12.2026",
      }),
      NOW,
    );
    expect(t.address).toBeNull();
    expect(t.bank).toBeNull();
    expect(t.termination).toEqual({
      requestedDate: "2026-12-31",
      reason: null,
    });
  });

  it("keeps a missing country null and strips PLZ to digits", () => {
    expect(
      normalizeExtraction(address({ plz: "D-50667 " }), NOW).address,
    ).toMatchObject({
      plz: "50667",
      country: null,
    });
  });

  it("keeps a 4-digit PLZ so the PLZ rule can block it", () => {
    expect(
      normalizeExtraction(address({ plz: "5066" }), NOW).address?.plz,
    ).toBe("5066");
  });

  it("turns empty or blank strings into null", () => {
    const n = normalizeExtraction(
      address({ hausnr: "  ", plz: "abc", sender_name: "" }),
      NOW,
    );
    expect(n.address).toMatchObject({ houseNo: null, plz: null });
    expect(n.identity.senderName).toBeNull();
  });

  it("treats an unparseable date of birth as not stated", () => {
    expect(
      normalizeExtraction(bank({ date_of_birth: "irgendwann" }), NOW).identity
        .dateOfBirth,
    ).toBeNull();
  });

  it("parses written German dates", () => {
    expect(
      normalizeExtraction(bank({ effective_date: "1. Januar 2027" }), NOW)
        .effectiveDate,
    ).toBe("2027-01-01");
  });

  it("puts the primary intent first and removes duplicates", () => {
    const n = normalizeExtraction(
      parse({
        primary_intent: "bank_change",
        intents: ["address_change", "bank_change", "address_change"],
        iban: null,
      }),
      NOW,
    );
    expect(n.intents).toEqual(["bank_change", "address_change"]);
  });

  it("adds the primary intent when the model left it out of the list", () => {
    const n = normalizeExtraction(
      parse({
        primary_intent: "bank_change",
        intents: ["address_change"],
        iban: null,
      }),
      NOW,
    );
    expect(n.intents).toEqual(["bank_change", "address_change"]);
  });
});

describe("toRuleInput + evaluate", () => {
  const run = (extraction: ReturnType<typeof parse>, overrides = {}) =>
    evaluate(
      toRuleInput(normalizeExtraction(extraction, NOW), {
        ...ctx,
        ...overrides,
      }),
    );

  it("clean bank change with messy formatting is auto-executed", () => {
    const result = run(bank());
    expect(result.decision).toBe("AUTO_EXECUTE");
    expect(result.normalizedParams).toEqual({
      kind: "bank_change",
      iban: "DE89370400440532013000",
      accountHolder: "Anna Müller-Schmidt",
    });
  });

  it("a missing IBAN is reported as BANK_IBAN_INVALID", () => {
    const result = run(bank({ iban: null }));
    expect(result.decision).toBe("REPLY_ONLY");
    expect(result.reasonCodes).toContain("BANK_IBAN_INVALID");
  });

  it("a 4-digit PLZ blocks", () => {
    expect(run(address({ plz: "5066" })).reasonCodes).toEqual([
      "ADDR_PLZ_INVALID",
    ]);
  });

  it("a missing house number blocks", () => {
    expect(run(address({ hausnr: null })).reasonCodes).toEqual([
      "ADDR_INCOMPLETE",
    ]);
  });

  it("a Spanish address escalates", () => {
    const result = run(address({ plz: "28001", land: "Spanien" }));
    expect(result.decision).toBe("NEEDS_REVIEW");
    expect(result.reasonCodes).toEqual(["ADDR_NON_DE"]);
  });

  it("an unknown policy blocks", () => {
    expect(run(address(), { snapshot: null }).reasonCodes).toContain(
      "ID_POLICY_NOT_FOUND",
    );
  });

  it("bank change plus address change escalates as multi-intent", () => {
    const result = run(bank({ intents: ["bank_change", "address_change"] }));
    expect(result.reasonCodes).toContain("MULTI_INTENT_RISK");
    expect(result.decision).toBe("NEEDS_REVIEW");
  });

  it("a differing date of birth escalates, a missing one does not", () => {
    expect(run(bank({ date_of_birth: "01.01.1990" })).reasonCodes).toContain(
      "ID_DOB_MISMATCH",
    );
    expect(run(bank({ date_of_birth: null })).decision).toBe("AUTO_EXECUTE");
  });

  it("low confidence escalates as OTHER_INTENT", () => {
    expect(run(address({ confidence: 0.4 })).reasonCodes).toContain(
      "OTHER_INTENT",
    );
  });

  it("injection text cannot change the outcome: holder mismatch still escalates", () => {
    // The model extracted the mismatching holder and ignored the injected instruction.
    const result = run(bank({ account_holder: "Peter Müller-Schmidt" }));
    expect(result.decision).toBe("NEEDS_REVIEW");
    expect(result.reasonCodes).toEqual(["BANK_HOLDER_MISMATCH"]);
  });
});
