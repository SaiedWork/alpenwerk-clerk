import { describe, expect, it } from "vitest";
import { LegacyDriverError } from "@/agent/executor/errors";
import {
  parsePolicyPage,
  type RawPolicyPage,
} from "@/agent/executor/parse-policy";
import { formatCalendarDate, formatEuro } from "@/legacy/format";
import { buildCustomerFixtures } from "../../../seed/customers";
import { snapshotFromFixture } from "../../../seed/snapshot";

const NOW = new Date("2026-11-05T10:00:00Z");

const base: RawPolicyPage = {
  texts: {
    "customer-name": "Frau Dr. Anna Maria Müller Schmidt",
    "customer-birthdate": "12.04.1985",
    "customer-email": "anna@example.test",
    "policy-no": "AW-100101",
    "policy-status": "aktiv",
    "policy-surrender-value": "11.840,50 €",
    "policy-irrevocable": "nein",
  },
  activeMandate: { iban: "DE89370400440532013000", holder: "Anna Schmidt" },
  changes: [],
};

const withText = (key: string, value: string | null): RawPolicyPage => ({
  ...base,
  texts: { ...base.texts, [key]: value },
});

describe("parsePolicyPage", () => {
  it("reads every field of a normal page", () => {
    expect(parsePolicyPage(base, NOW)).toEqual({
      policyNo: "AW-100101",
      status: "aktiv",
      firstName: "Anna Maria Müller",
      lastName: "Schmidt",
      dateOfBirth: "1985-04-12",
      email: "anna@example.test",
      activeMandate: { iban: "DE89370400440532013000", holder: "Anna Schmidt" },
      lastAddressChangeAt: null,
      irrevocableBeneficiary: false,
      surrenderValueIndicative: 11840.5,
    });
  });

  it("drops salutation and titles from the name", () => {
    const parsed = parsePolicyPage(
      withText("customer-name", "Herr Max Mustermann"),
      NOW,
    );
    expect([parsed.firstName, parsed.lastName]).toEqual(["Max", "Mustermann"]);
  });

  it("takes the latest address change and ignores other fields", () => {
    const parsed = parsePolicyPage(
      {
        ...base,
        changes: [
          { at: "2026-10-01T08:00:00.000Z", field: "adresse" },
          { at: "2026-10-31T08:00:00.000Z", field: "adresse" },
          { at: "2026-11-04T08:00:00.000Z", field: "iban" },
        ],
      },
      NOW,
    );
    expect(parsed.lastAddressChangeAt).toEqual(
      new Date("2026-10-31T08:00:00.000Z"),
    );
  });

  it("reads 'ja' as irrevocable beneficiary", () => {
    expect(
      parsePolicyPage(withText("policy-irrevocable", "ja"), NOW)
        .irrevocableBeneficiary,
    ).toBe(true);
  });

  it("returns no mandate when the page shows no active one", () => {
    expect(
      parsePolicyPage({ ...base, activeMandate: null }, NOW).activeMandate,
    ).toBeNull();
  });

  it.each([
    ["policy-status", "gekündigt"],
    ["customer-birthdate", "irgendwann"],
    ["customer-name", "Herr Mustermann"],
    ["customer-email", null],
    ["policy-surrender-value", "viel"],
  ])("fails with LEGACY_PARSE_FAILED for bad %s", (key, value) => {
    const run = () => parsePolicyPage(withText(key, value), NOW);
    expect(run).toThrow(LegacyDriverError);
    expect(run).toThrow(
      expect.objectContaining({ code: "LEGACY_PARSE_FAILED" }),
    );
  });

  it("round-trips every seed fixture as the page renders it", () => {
    for (const fixture of buildCustomerFixtures(NOW)) {
      const { customer, policy, mandate, changes = [] } = fixture;
      const raw: RawPolicyPage = {
        texts: {
          "customer-name": `${customer.anrede} ${customer.vorname} ${customer.nachname}`,
          "customer-birthdate": formatCalendarDate(customer.geburtsdatum),
          "customer-email": customer.email,
          "policy-no": policy.policyNo,
          "policy-status": policy.status ?? null,
          "policy-surrender-value": formatEuro(
            policy.rueckkaufswertIndikativ ?? "0",
          ),
          "policy-irrevocable": policy.unwiderruflicheBezugsberechtigung
            ? "ja"
            : "nein",
        },
        activeMandate:
          mandate?.status === "aktiv"
            ? { iban: mandate.iban, holder: mandate.kontoinhaber }
            : null,
        changes: changes.map((c) => ({
          at: c.changedAt ? c.changedAt.toISOString() : null,
          field: c.field,
        })),
      };
      const parsed = parsePolicyPage(raw, NOW);
      const expected = snapshotFromFixture(fixture);
      const full = (s: { firstName: string; lastName: string }) =>
        `${s.firstName} ${s.lastName}`;
      expect(
        { ...parsed, firstName: full(parsed), lastName: "" },
        fixture.key,
      ).toEqual({
        ...expected,
        firstName: full(expected),
        lastName: "",
      });
    }
  });
});
