import { describe, expect, it } from "vitest";
import { identifyRules } from "@/agent/rules/identify";
import type { LegacySnapshot, RuleInput } from "@/agent/rules/types";

const snapshot: LegacySnapshot = {
  policyNo: "AW-100101",
  status: "aktiv",
  firstName: "Anna",
  lastName: "Müller-Schmidt",
  dateOfBirth: "1985-04-12",
  email: "anna.mueller@example.test",
};

function input(overrides: Partial<RuleInput> = {}): RuleInput {
  return {
    intents: ["address_change"],
    primaryIntent: "address_change",
    confidence: 0.95,
    identity: { senderName: "Anna Müller-Schmidt", dateOfBirth: "1985-04-12" },
    senderEmail: "anna.mueller@example.test",
    snapshot,
    now: new Date("2026-11-05T10:00:00Z"),
    ...overrides,
  };
}

const codes = (i: RuleInput) => identifyRules(i).map((r) => r.code);

describe("identifyRules", () => {
  it("passes a fully matching sender", () => {
    expect(identifyRules(input())).toEqual([]);
  });

  it("ID_POLICY_NOT_FOUND blocks and skips every other check", () => {
    const results = identifyRules(
      input({ snapshot: null, senderEmail: "other@example.test" }),
    );
    expect(results).toEqual([
      expect.objectContaining({
        code: "ID_POLICY_NOT_FOUND",
        severity: "block",
      }),
    ]);
  });

  describe("ID_NAME_MISMATCH", () => {
    it.each([
      ["Mueller Schmidt, Anna", false], // order, umlaut and hyphen variants
      ["anna müller schmidt", false],
      ["Peter Müller-Schmidt", true],
      ["Müller", true], // partial name cannot be verified
    ])("%s -> mismatch %s", (senderName, mismatch) => {
      const i = input({ identity: { senderName, dateOfBirth: null } });
      expect(codes(i).includes("ID_NAME_MISMATCH")).toBe(mismatch);
    });

    it("is not raised when the email gives no name", () => {
      const i = input({ identity: { senderName: null, dateOfBirth: null } });
      expect(codes(i)).toEqual([]);
    });
  });

  describe("ID_DOB_MISMATCH", () => {
    it.each([
      ["1985-04-12", false],
      ["1985-12-04", true],
      ["12.04.1985", true], // not normalized: treated as differing
      [null, false],
    ])("%s -> mismatch %s", (dateOfBirth, mismatch) => {
      const i = input({ identity: { senderName: null, dateOfBirth } });
      expect(codes(i).includes("ID_DOB_MISMATCH")).toBe(mismatch);
    });
  });

  describe("ID_POLICY_INACTIVE", () => {
    it.each([
      ["aktiv", false],
      ["ruhend", true],
      ["storniert", true],
    ] as const)("%s -> inactive %s", (status, inactive) => {
      const i = input({ snapshot: { ...snapshot, status } });
      expect(codes(i).includes("ID_POLICY_INACTIVE")).toBe(inactive);
    });
  });

  describe("ID_SENDER_UNKNOWN", () => {
    it.each([
      ["anna.mueller@example.test", false],
      ["  Anna.Mueller@Example.TEST ", false],
      ["someone.else@example.test", true],
    ])("%s -> unknown %s", (senderEmail, unknown) => {
      expect(codes(input({ senderEmail })).includes("ID_SENDER_UNKNOWN")).toBe(
        unknown,
      );
    });
  });

  it("all identify mismatches escalate with a German message", () => {
    const results = identifyRules(
      input({
        identity: { senderName: "Peter Meier", dateOfBirth: "1990-01-01" },
        senderEmail: "x@example.test",
        snapshot: { ...snapshot, status: "ruhend" },
      }),
    );
    expect(results.map((r) => r.code)).toEqual([
      "ID_NAME_MISMATCH",
      "ID_DOB_MISMATCH",
      "ID_POLICY_INACTIVE",
      "ID_SENDER_UNKNOWN",
    ]);
    for (const r of results) {
      expect(r.severity).toBe("escalate");
      expect(r.messageDe.length).toBeGreaterThan(10);
    }
  });
});
