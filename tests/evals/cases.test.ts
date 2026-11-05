import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { toRuleInput } from "@/agent/llm/normalize";
import { evaluate } from "@/agent/rules/engine";
import { buildCustomerFixtures } from "../../seed/customers";
import { expectedExtraction } from "../../evals/expected";
import { EvalCaseError, loadEvalCases } from "../../evals/loader";
import { evalCaseSchema } from "../../evals/schema";
import {
  EVAL_NOW,
  findFixture,
  snapshotFromFixture,
} from "../../evals/snapshot";

const validCase = {
  id: "Z01",
  policyFixture: "becker",
  email: { from: "a@example.test", subject: "s", body: "b" },
  expected: { intent: "other", decision: "NEEDS_REVIEW", reasonCodes: [] },
};

function dirWith(files: Record<string, unknown>): string {
  const dir = mkdtempSync(path.join(tmpdir(), "eval-cases-"));
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(path.join(dir, name), JSON.stringify(content));
  }
  return dir;
}

describe("evalCaseSchema", () => {
  it("accepts a minimal case and defaults expectedFields", () => {
    expect(evalCaseSchema.parse(validCase).expectedFields).toEqual({});
  });

  it.each([
    [
      "unknown reason code",
      { expected: { ...validCase.expected, reasonCodes: ["NOPE"] } },
    ],
    [
      "oversized body",
      { email: { ...validCase.email, body: "x".repeat(4001) } },
    ],
    [
      "oversized subject",
      { email: { ...validCase.email, subject: "x".repeat(201) } },
    ],
    ["bad sender address", { email: { ...validCase.email, from: "nobody" } }],
    ["bad id", { id: "bank-1" }],
    ["unknown field key", { expectedFields: { foo: "bar" } }],
  ])("rejects %s", (_name, override) => {
    expect(
      evalCaseSchema.safeParse({ ...validCase, ...override }).success,
    ).toBe(false);
  });
});

describe("loadEvalCases", () => {
  it("loads and sorts valid files", () => {
    const dir = dirWith({
      "Z02.json": { ...validCase, id: "Z02" },
      "Z01.json": validCase,
    });
    expect(loadEvalCases(dir).map((c) => c.id)).toEqual(["Z01", "Z02"]);
  });

  it("rejects a file whose name differs from its id (keeps ids unique)", () => {
    const dir = dirWith({ "Z09.json": validCase });
    expect(() => loadEvalCases(dir)).toThrow(EvalCaseError);
  });

  it("names the file and the field of an invalid case", () => {
    const dir = dirWith({ "Z01.json": { ...validCase, policyFixture: "" } });
    expect(() => loadEvalCases(dir)).toThrow(/Z01\.json: policyFixture/);
  });
});

describe("snapshotFromFixture", () => {
  const byKey = (key: string) => {
    const fixture = findFixture(key);
    if (!fixture) throw new Error(`missing fixture ${key}`);
    return snapshotFromFixture(fixture);
  };

  it("maps an ordinary customer", () => {
    expect(byKey("becker")).toMatchObject({
      policyNo: "AW-100102",
      status: "aktiv",
      lastName: "Becker",
      activeMandate: { holder: "Thomas Becker" },
      irrevocableBeneficiary: false,
    });
  });

  it("has no active mandate for a revoked one", () => {
    expect(byKey("krause-no-mandate").activeMandate).toBeNull();
  });

  it("keeps a recent address change recent relative to EVAL_NOW", () => {
    const at = byKey("neumann-recent-move").lastAddressChangeAt;
    expect(at && EVAL_NOW.getTime() - at.getTime()).toBe(5 * 86_400_000);
  });

  it("flags the irrevocable beneficiary", () => {
    expect(byKey("fischer-irrevocable").irrevocableBeneficiary).toBe(true);
  });
});

describe("committed eval cases", () => {
  const cases = loadEvalCases();
  const allFixtures = buildCustomerFixtures(EVAL_NOW);

  it("has at least the foundation cases", () => {
    expect(cases.map((c) => c.id)).toEqual(
      expect.arrayContaining(["A05", "B01", "I01", "X02"]),
    );
  });

  it.each(cases.map((c) => [c.id, c] as const))(
    "%s: labels are reachable by the rule engine",
    (_id, c) => {
      const fixture = findFixture(c.policyFixture);
      if (c.policyFixture !== null) expect(fixture).not.toBeNull();

      const policyNo = c.expectedFields.policyNo;
      if (fixture) expect(policyNo).toBe(fixture.policy.policyNo);
      else
        expect(allFixtures.map((f) => f.policy.policyNo)).not.toContain(
          policyNo,
        );

      const result = evaluate(
        toRuleInput(expectedExtraction(c), {
          senderEmail: c.email.from,
          snapshot: fixture ? snapshotFromFixture(fixture) : null,
          now: EVAL_NOW,
        }),
      );
      expect(result.decision).toBe(c.expected.decision);
      expect([...result.reasonCodes].sort()).toEqual(
        [...c.expected.reasonCodes].sort(),
      );
    },
  );
});
