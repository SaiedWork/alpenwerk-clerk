import type { LegacySnapshot, RuleInput } from "@/agent/rules/types";

export const NOW = new Date("2026-11-05T10:00:00Z");

export const snapshot: LegacySnapshot = {
  policyNo: "AW-100101",
  status: "aktiv",
  firstName: "Anna",
  lastName: "Müller-Schmidt",
  dateOfBirth: "1985-04-12",
  email: "anna.mueller@example.test",
  activeMandate: {
    iban: "DE02120300000000202051",
    holder: "Anna Müller-Schmidt",
  },
  lastAddressChangeAt: null,
};

/** A fully matching, rule-clean input; tests override what they exercise. */
export function input(overrides: Partial<RuleInput> = {}): RuleInput {
  return {
    intents: ["address_change"],
    primaryIntent: "address_change",
    confidence: 0.95,
    identity: { senderName: "Anna Müller-Schmidt", dateOfBirth: "1985-04-12" },
    address: null,
    bank: null,
    senderEmail: "anna.mueller@example.test",
    snapshot,
    now: NOW,
    ...overrides,
  };
}
