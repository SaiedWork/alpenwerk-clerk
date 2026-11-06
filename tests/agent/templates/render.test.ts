import { describe, expect, it } from "vitest";
import { TemplateError } from "@/agent/templates/errors";
import {
  render,
  TEMPLATE_KEYS,
  type TemplateKey,
} from "@/agent/templates/render";
import { maskIban } from "@/lib/iban";
import { t } from "@/lib/i18n-de";

const IBAN = "DE89 3704 0044 0532 0130 00";

const samples: { [K in TemplateKey]: Record<string, unknown> } = {
  address_confirmed: {
    policyNo: "AW-100101",
    street: "Lindenstraße",
    houseNo: "12a",
    plz: "50667",
    city: "Köln",
  },
  bank_confirmed: { policyNo: "AW-100101", maskedIban: maskIban(IBAN) },
  request_missing_info: { missing: ["house_no", "plz"] },
  bank_same_iban: {},
  unknown_policy: {},
  escalated_ack: {},
  termination_received: { policyNo: "AW-100101" },
  rejected_by_reviewer: {},
};

const renderAny = (key: string, vars: unknown) =>
  (render as (k: string, v: unknown) => ReturnType<typeof render>)(key, vars);
const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof TemplateError ? e.code : "OTHER";
  }
  return null;
};

describe("render", () => {
  it("has a sample for every template", () => {
    expect(Object.keys(samples).sort()).toEqual([...TEMPLATE_KEYS].sort());
  });

  it.each(TEMPLATE_KEYS)("%s renders a complete formal reply", (key) => {
    const { subject, body } = renderAny(key, samples[key]);
    expect(subject.length).toBeGreaterThan(0);
    expect(body.startsWith(t.replies.greeting)).toBe(true);
    expect(body.endsWith(t.replies.signature)).toBe(true);
    expect(`${subject}\n${body}`).not.toMatch(/[{}]/);
    expect(body).toMatch(/\b(Sie|Ihnen|Ihr\w*)\b/);
  });

  it.each(TEMPLATE_KEYS)(
    "%s never contains a rule code, a full IBAN or the unmasked number",
    (key) => {
      const { subject, body } = renderAny(key, samples[key]);
      const all = `${subject}\n${body}`;
      for (const code of Object.keys(t.rules)) expect(all).not.toContain(code);
      expect(all.replace(/\s/g, "")).not.toContain(IBAN.replace(/\s/g, ""));
    },
  );

  it("fills the variables", () => {
    const { subject, body } = render("address_confirmed", {
      policyNo: "AW-100101",
      street: "Lindenstraße",
      houseNo: "12a",
      plz: "50667",
      city: "Köln",
    });
    expect(subject).toContain("AW-100101");
    expect(body).toContain("Lindenstraße 12a\n50667 Köln");
  });

  it("shows only the masked IBAN in bank_confirmed", () => {
    const { body } = render("bank_confirmed", {
      policyNo: "AW-100101",
      maskedIban: maskIban(IBAN),
    });
    expect(body).toContain("DE89 **** **** **** **** 00");
  });

  it("lists each missing field once, with its German label", () => {
    const { body } = render("request_missing_info", {
      missing: ["house_no", "plz", "plz"],
    });
    expect(body).toContain("- Hausnummer\n- Postleitzahl (fünfstellig)");
    expect(body.match(/Postleitzahl/g)).toHaveLength(1);
    expect(body).not.toContain("Straße");
  });

  it("termination_received hints at financial disadvantages without advice or amounts", () => {
    const { body } = render("termination_received", {
      policyNo: "AW-100101",
    });
    expect(body).toContain("finanzielle Nachteile");
    expect(body).not.toMatch(/€|Euro|empfehlen|raten Ihnen/);
  });

  describe("errors", () => {
    it("rejects an unknown template", () => {
      expect(codeOf(() => renderAny("nope", {}))).toBe("TEMPLATE_UNKNOWN");
    });

    it.each([
      ["address_confirmed", { ...samples.address_confirmed, city: undefined }],
      ["address_confirmed", { ...samples.address_confirmed, plz: "  " }],
      ["bank_confirmed", { policyNo: "AW-100101" }],
      ["request_missing_info", { missing: [] }],
      ["request_missing_info", { missing: ["shoe_size"] }],
      ["termination_received", {}],
    ])("rejects missing or empty variables for %s", (key, vars) => {
      expect(codeOf(() => renderAny(key, vars))).toBe(
        "TEMPLATE_VARIABLE_MISSING",
      );
    });

    it("rejects unexpected variables", () => {
      expect(
        codeOf(() => renderAny("escalated_ack", { reasonCode: "X" })),
      ).toBe("TEMPLATE_VARIABLE_MISSING");
    });

    it("does not echo variable values in the error", () => {
      try {
        renderAny("bank_confirmed", { policyNo: "AW-1", maskedIban: IBAN });
      } catch (e) {
        expect((e as Error).message).not.toContain("3704");
        return;
      }
      throw new Error("expected a throw");
    });

    it("rejects a full IBAN passed as the masked value", () => {
      expect(
        codeOf(() =>
          renderAny("bank_confirmed", {
            policyNo: "AW-100101",
            maskedIban: IBAN,
          }),
        ),
      ).toBe("TEMPLATE_VARIABLE_MISSING");
    });

    it("rejects a full IBAN smuggled into another field", () => {
      expect(
        codeOf(() =>
          render("address_confirmed", {
            ...(samples.address_confirmed as {
              policyNo: string;
              houseNo: string;
              plz: string;
              city: string;
            }),
            street: IBAN,
          }),
        ),
      ).toBe("TEMPLATE_UNSAFE_OUTPUT");
    });

    it("rejects line breaks in a value (no header or layout injection)", () => {
      expect(
        codeOf(() =>
          render("termination_received", { policyNo: "AW-1\nBcc: x@y.z" }),
        ),
      ).toBe("TEMPLATE_VARIABLE_MISSING");
    });
  });
});
