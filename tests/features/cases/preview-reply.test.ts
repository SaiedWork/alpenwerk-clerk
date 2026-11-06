import { describe, expect, it } from "vitest";
import type { StoredEvent } from "@/agent/pipeline/types";
import { previewReply } from "@/features/cases/view/preview-reply";

const extraction = {
  policyNo: "AW-100101",
  language: "de",
  intents: ["bank_change"],
  primaryIntent: "bank_change",
  confidence: 0.93,
  identity: { senderName: "Anna Muster", dateOfBirth: null },
  address: null,
  bank: { iban: "DE89370400440532013000", accountHolder: "Anna Muster" },
  effectiveDate: null,
  termination: null,
  summary: null,
};

function event(
  seq: number,
  step: string,
  payload: unknown,
  status: StoredEvent["status"] = "succeeded",
): StoredEvent {
  return { id: seq, seq, step, status, payload, durationMs: 1 };
}

const events: StoredEvent[] = [
  event(1, "analyze", { extraction, source: "cache", model: "m" }),
  event(2, "identify", {
    snapshot: {
      policyNo: "AW-100101",
      status: "aktiv",
      firstName: "Anna",
      lastName: "Muster",
      dateOfBirth: "1985-04-12",
      email: "a@example.org",
      activeMandate: { iban: "DE02120300000000202051", holder: "Anna Muster" },
      lastAddressChangeAt: null,
      irrevocableBeneficiary: false,
      surrenderValueIndicative: null,
    },
  }),
  event(3, "evaluate", {
    decision: "NEEDS_REVIEW",
    reasonCodes: ["BANK_NEW_MANDATE_NEEDS_REVIEW"],
    normalizedParams: {
      kind: "bank_change",
      iban: "DE89370400440532013000",
      accountHolder: "Anna Muster",
    },
  }),
];

describe("previewReply", () => {
  it("renders both outcomes without exposing the full IBAN", () => {
    const preview = previewReply(events);
    expect(preview?.approve.body).toContain("AW-100101");
    expect(preview?.approve.body).toContain("DE89 **** **** **** **** 00");
    expect(JSON.stringify(preview)).not.toContain("3704");
    expect(preview?.reject.subject).not.toBe(preview?.approve.subject);
  });

  it("returns null when evaluate has not run", () => {
    expect(previewReply(events.slice(0, 2))).toBeNull();
  });

  it("returns null for an unreadable payload instead of guessing", () => {
    expect(
      previewReply([
        event(1, "analyze", { nonsense: true }),
        ...events.slice(1),
      ]),
    ).toBeNull();
  });

  it("ignores events that are not done", () => {
    const failed = event(3, "evaluate", {}, "failed");
    expect(previewReply([...events.slice(0, 2), failed])).toBeNull();
  });
});
