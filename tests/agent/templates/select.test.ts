import { describe, expect, it } from "vitest";
import type { RuleCode } from "@/agent/rules/types";
import { selectTemplate, type ReplyCase } from "@/agent/templates/select";
import { loadEvalCases } from "../../../evals/loader";

const base: ReplyCase = {
  decision: "AUTO_EXECUTE",
  intent: "address_change",
  reasonCodes: [],
  executed: true,
  review: "none",
};
const pick = (over: Partial<ReplyCase>) => selectTemplate({ ...base, ...over });

describe("selectTemplate", () => {
  it.each([
    ["address_change", "address_confirmed"],
    ["bank_change", "bank_confirmed"],
  ] as const)("confirms an executed %s", (intent, key) => {
    expect(pick({ intent })).toBe(key);
  });

  it("does not confirm a change that was not written (seed mode, skipped)", () => {
    expect(pick({ executed: false })).toBe("escalated_ack");
  });

  it("confirms a change a human approved and the browser wrote", () => {
    expect(
      pick({
        decision: "NEEDS_REVIEW",
        intent: "bank_change",
        review: "approved",
      }),
    ).toBe("bank_confirmed");
  });

  it("a rejection always wins", () => {
    for (const intent of [
      "address_change",
      "bank_change",
      "termination",
      "other",
    ] as const) {
      expect(
        pick({ decision: "NEEDS_REVIEW", intent, review: "rejected" }),
      ).toBe("rejected_by_reviewer");
    }
  });

  it.each([
    [["ID_POLICY_NOT_FOUND"], "unknown_policy"],
    [["BANK_SAME_IBAN"], "bank_same_iban"],
    [["ADDR_INCOMPLETE"], "request_missing_info"],
    [["ADDR_PLZ_INVALID"], "request_missing_info"],
    [["BANK_IBAN_INVALID"], "request_missing_info"],
    [["ADDR_INCOMPLETE", "ID_POLICY_NOT_FOUND"], "unknown_policy"],
    [["BANK_IBAN_INVALID", "BANK_SAME_IBAN"], "bank_same_iban"],
  ] as [RuleCode[], string][])(
    "REPLY_ONLY with %j gives %s",
    (reasonCodes, key) => {
      expect(
        pick({ decision: "REPLY_ONLY", executed: false, reasonCodes }),
      ).toBe(key);
    },
  );

  it("falls back to the neutral acknowledgment for an unmapped REPLY_ONLY", () => {
    expect(pick({ decision: "REPLY_ONLY", executed: false })).toBe(
      "escalated_ack",
    );
  });

  it.each([
    ["termination", "termination_received"],
    ["other", "escalated_ack"],
    ["address_change", "escalated_ack"],
    ["bank_change", "escalated_ack"],
  ] as const)(
    "NEEDS_REVIEW %s (pending, nothing written) gives %s",
    (intent, key) => {
      expect(pick({ decision: "NEEDS_REVIEW", intent, executed: false })).toBe(
        key,
      );
    },
  );

  it("an approved termination is acknowledged, never confirmed", () => {
    expect(
      pick({
        decision: "NEEDS_REVIEW",
        intent: "termination",
        review: "approved",
        executed: false,
      }),
    ).toBe("termination_received");
  });

  it("every one of the 24 eval cases gets a sensible template", () => {
    const keyOf = (id: string) => {
      const c = loadEvalCases().find((e) => e.id === id)!;
      return selectTemplate({
        decision: c.expected.decision,
        intent: c.expected.intent,
        reasonCodes: c.expected.reasonCodes,
        executed: c.expected.decision === "AUTO_EXECUTE",
        review: "none",
      });
    };
    const all = loadEvalCases();
    expect(all).toHaveLength(24);
    const expected: Record<string, string> = {
      B01: "bank_confirmed",
      B03: "request_missing_info",
      B04: "escalated_ack",
      A01: "address_confirmed",
      A02: "request_missing_info",
      A03: "request_missing_info",
      A04: "escalated_ack",
      I01: "unknown_policy",
      I02: "escalated_ack",
      T01: "termination_received",
      T02: "termination_received",
      T03: "escalated_ack",
      X01: "escalated_ack",
      X02: "escalated_ack",
      X03: "bank_confirmed",
      X04: "escalated_ack",
    };
    for (const [id, key] of Object.entries(expected)) {
      expect(keyOf(id), id).toBe(key);
    }
    // No REPLY_ONLY case may fall through to the generic fallback.
    for (const c of all.filter((e) => e.expected.decision === "REPLY_ONLY")) {
      expect(keyOf(c.id), c.id).not.toBe("escalated_ack");
    }
  });
});
