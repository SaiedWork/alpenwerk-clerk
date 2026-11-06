import { describe, expect, it } from "vitest";
import {
  AUDIT_KINDS,
  auditHref,
  parseAuditQuery,
} from "@/features/audit/schemas/audit-query";
import {
  auditActionLabel,
  auditDetailsSummary,
} from "@/features/audit/view/audit-view";

const ID = "11111111-1111-4111-8111-111111111111";

describe("auditActionLabel", () => {
  it("translates fixed and step actions", () => {
    expect(auditActionLabel("case.received")).toBe("E-Mail eingegangen");
    expect(auditActionLabel("reply.sent_simulated")).toBe(
      "Antwort gesendet (simuliert)",
    );
    expect(auditActionLabel("step.analyze.succeeded")).toBe(
      "E-Mail analysieren: erledigt",
    );
    expect(auditActionLabel("step.execute.skipped")).toBe(
      "Änderung ausführen: übersprungen",
    );
  });

  it("shows an unknown action as stored instead of hiding it", () => {
    expect(auditActionLabel("system.something_new")).toBe(
      "system.something_new",
    );
    expect(auditActionLabel("step.bogus.succeeded")).toBe(
      "step.bogus.succeeded",
    );
  });
});

describe("auditDetailsSummary", () => {
  it("summarizes harmless details in German", () => {
    expect(auditDetailsSummary({ source: "simulator" })).toBe("Simulator");
    expect(
      auditDetailsSummary({
        reviewerLabel: "Sachbearbeitung (Demo)",
        hasNote: true,
      }),
    ).toBe("von Sachbearbeitung (Demo) · mit Notiz");
    expect(
      auditDetailsSummary({
        decision: "NEEDS_REVIEW",
        reasonCodes: ["TERM_ALWAYS_REVIEW"],
        durationMs: 1500,
      }),
    ).toBe("Entscheidung: Prüfung nötig · Gründe: TERM_ALWAYS_REVIEW · 1,5 s");
  });

  it("gives no line for empty, missing or unexpected details", () => {
    expect(auditDetailsSummary({})).toBeNull();
    expect(auditDetailsSummary(null)).toBeNull();
    // An unknown key (e.g. email text) is never rendered.
    expect(auditDetailsSummary({ body: "secret" })).toBeNull();
  });
});

describe("audit query", () => {
  it("parses filters and falls back for bad values", () => {
    expect(
      parseAuditQuery({ actor: "human", kind: "reply", case: ID, page: "2" }),
    ).toEqual({
      actor: "human",
      kind: "reply",
      caseId: ID,
      page: 2,
    });
    expect(
      parseAuditQuery({ actor: "root", kind: "x", case: "nope", page: "-3" }),
    ).toEqual({
      actor: undefined,
      kind: undefined,
      caseId: undefined,
      page: 1,
    });
    expect(parseAuditQuery({ actor: ["agent", "human"] }).actor).toBe("agent");
  });

  it("builds links with only the set filters", () => {
    expect(auditHref({})).toBe("/audit");
    expect(auditHref({ actor: "agent", caseId: ID, page: 3 })).toBe(
      `/audit?actor=agent&case=${ID}&page=3`,
    );
    expect(AUDIT_KINDS).toHaveLength(4);
  });
});
