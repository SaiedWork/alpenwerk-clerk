import { describe, expect, it } from "vitest";
import type { NormalizedExtraction } from "@/agent/llm/normalize";
import { STUCK_AFTER_MS } from "@/features/review/server/review-case";
import {
  buildCaseView,
  canResumeCase,
  type CaseDetailRows,
} from "@/features/cases/view/case-view";
import { extractedFields } from "@/features/cases/view/extracted-fields";
import { summarizeEvent } from "@/features/cases/view/summarize-event";

const NOW = new Date("2026-11-06T12:00:00Z");

const extraction: NormalizedExtraction = {
  policyNo: "AW-100101",
  language: "de",
  intents: ["bank_change", "address_change"],
  primaryIntent: "bank_change",
  confidence: 0.93,
  identity: { senderName: "Anna Muster", dateOfBirth: "1985-04-12" },
  address: null,
  bank: { iban: "DE89370400440532013000", accountHolder: "Anna Muster" },
  effectiveDate: null,
  termination: null,
  summary: null,
};

function rows(overrides: Partial<CaseDetailRows["case"]> = {}): CaseDetailRows {
  return {
    case: {
      id: "11111111-1111-4111-8111-111111111111",
      receivedAt: new Date("2026-11-06T11:00:00Z"),
      updatedAt: NOW,
      fromEmail: "a@example.org",
      subject: "Bankverbindung",
      body: "Hallo",
      status: "DONE",
      intent: "bank_change",
      decision: "AUTO_EXECUTE",
      confidence: "0.930",
      extracted: extraction,
      reasonCodes: [],
      handlingMs: 1200,
      ...overrides,
    },
    events: [],
    screenshots: [],
    reply: null,
    review: null,
  };
}

describe("extractedFields", () => {
  it("masks the IBAN and leaves out empty values", () => {
    const fields = extractedFields(extraction);
    const iban = fields.find((f) => f.label === "IBAN");
    expect(iban?.value).toBe("DE89 **** **** **** **** 00");
    expect(JSON.stringify(fields)).not.toContain("370400440532013000");
    expect(fields.some((f) => f.label === "Straße")).toBe(false);
    expect(fields.find((f) => f.label === "Geburtsdatum")?.value).toBe(
      "12.04.1985",
    );
  });

  it("lists the other detected intents and shows odd dates as stored", () => {
    const fields = extractedFields({
      ...extraction,
      identity: { senderName: null, dateOfBirth: "kürzlich" },
    });
    expect(fields.find((f) => f.label === "Weitere Anliegen")?.value).toBe(
      "Adressänderung",
    );
    expect(fields.find((f) => f.label === "Geburtsdatum")?.value).toBe(
      "kürzlich",
    );
  });
});

describe("summarizeEvent", () => {
  it("summarizes the analysis without exposing extracted values", () => {
    const s = summarizeEvent("analyze", "succeeded", {
      extraction,
      source: "cache",
      model: "m",
    });
    expect(s.text).toBe(
      "Anliegen: Bankänderung, Sicherheit 93 % (aufgezeichnete Analyse)",
    );
  });

  it("uses the stored German message and code for a failed step", () => {
    expect(
      summarizeEvent("verify", "failed", {
        code: "VERIFY_MISMATCH",
        messageDe: "Nicht bestätigt.",
      }),
    ).toEqual({ text: "Nicht bestätigt.", errorCode: "VERIFY_MISMATCH" });
  });

  it.each([
    [
      "execute",
      "skipped",
      { reason: "REJECTED" },
      "Nicht ausgeführt: vom Prüfer abgelehnt.",
    ],
    [
      "execute",
      "succeeded",
      { kind: "bank_change", outcome: "unchanged" },
      "Altsystem enthielt bereits die Zielwerte.",
    ],
    [
      "execute",
      "succeeded",
      { kind: "bank_change", outcome: "changed" },
      "Änderung im Altsystem gespeichert.",
    ],
    [
      "verify",
      "succeeded",
      { kind: "bank_change", verified: true },
      "Änderung im Altsystem bestätigt.",
    ],
    ["verify", "skipped", { reason: "NOTHING_TO_VERIFY" }, "Nichts zu prüfen."],
    [
      "identify",
      "succeeded",
      { snapshot: null },
      "Police im Altsystem nicht gefunden.",
    ],
    [
      "reply",
      "succeeded",
      { templateKey: "x", autoSent: true },
      "Antwort erstellt und automatisch gesendet (simuliert).",
    ],
  ])("%s %s", (step, status, payload, expected) => {
    expect(
      summarizeEvent(step, status as "succeeded" | "skipped", payload).text,
    ).toBe(expected);
  });

  it("gives no summary for unreadable payloads or running steps", () => {
    expect(
      summarizeEvent("evaluate", "succeeded", { nonsense: 1 }).text,
    ).toBeNull();
    expect(summarizeEvent("analyze", "started", null).text).toBeNull();
    expect(summarizeEvent("unknown", "succeeded", {}).text).toBeNull();
  });
});

describe("canResumeCase", () => {
  const old = new Date(NOW.getTime() - STUCK_AFTER_MS);
  const fresh = new Date(NOW.getTime() - STUCK_AFTER_MS + 1000);

  it("offers a resume for failed cases at once", () => {
    expect(canResumeCase("FAILED", NOW, NOW)).toBe(true);
  });
  it("offers it for in-flight cases only after the stuck window", () => {
    expect(canResumeCase("EXECUTING", fresh, NOW)).toBe(false);
    expect(canResumeCase("EXECUTING", old, NOW)).toBe(true);
  });
  it("never offers it for finished or waiting cases", () => {
    for (const s of ["DONE", "REPLY_READY", "AWAITING_REVIEW"] as const) {
      expect(canResumeCase(s, old, NOW)).toBe(false);
    }
  });
});

describe("buildCaseView", () => {
  it("orders events by seq and tolerates unreadable stored JSON", () => {
    const r = rows({ extracted: { broken: true }, confidence: "abc" });
    r.events = [
      {
        id: 2,
        seq: 2,
        step: "identify",
        status: "succeeded",
        payload: { snapshot: null },
        durationMs: 5,
      },
      {
        id: 1,
        seq: 1,
        step: "analyze",
        status: "started",
        payload: null,
        durationMs: null,
      },
    ];
    const view = buildCaseView(r, NOW);
    expect(view.timeline.map((e) => e.id)).toEqual([1, 2]);
    expect(view.fields).toEqual([]);
    expect(view.confidencePct).toBeNull();
  });

  it("reports the confidence as a percentage and the in-flight state", () => {
    expect(buildCaseView(rows(), NOW).confidencePct).toBe(93);
    expect(buildCaseView(rows(), NOW).inFlight).toBe(false);
    expect(buildCaseView(rows({ status: "EXECUTING" }), NOW).inFlight).toBe(
      true,
    );
  });
});
