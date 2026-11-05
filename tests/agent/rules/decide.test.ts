import { describe, expect, it } from "vitest";
import { decide } from "@/agent/rules/decide";
import type { Intent, RuleResult, Severity } from "@/agent/rules/types";

const r = (severity: Severity): RuleResult => ({
  code: "ID_NAME_MISMATCH",
  severity,
  messageDe: "x",
});

describe("decide", () => {
  it.each<[string, Severity[], Intent, string]>([
    ["no results, address", [], "address_change", "AUTO_EXECUTE"],
    ["no results, bank", [], "bank_change", "AUTO_EXECUTE"],
    ["info only", ["info"], "address_change", "AUTO_EXECUTE"],
    ["escalate", ["escalate"], "address_change", "NEEDS_REVIEW"],
    ["block", ["block"], "address_change", "REPLY_ONLY"],
    [
      "block beats escalate",
      ["escalate", "block"],
      "bank_change",
      "REPLY_ONLY",
    ],
    ["termination is always reviewed", [], "termination", "NEEDS_REVIEW"],
    ["other is always reviewed", [], "other", "NEEDS_REVIEW"],
    [
      "block on termination still replies only",
      ["block"],
      "termination",
      "REPLY_ONLY",
    ],
  ])("%s", (_name, severities, intent, expected) => {
    expect(decide(severities.map(r), intent)).toBe(expected);
  });
});
