import { describe, expect, it } from "vitest";
import { addressMatches, bankMatches } from "@/agent/executor/targets";

const current = {
  street: "Hauptstraße",
  houseNo: "12",
  plz: "50667",
  city: "Köln",
  country: "Deutschland",
};
const target = { ...current, country: null as string | null };

describe("addressMatches", () => {
  it("matches identical values", () => {
    expect(addressMatches(current, target)).toBe(true);
  });

  it("ignores case and extra spaces", () => {
    expect(
      addressMatches(current, {
        ...target,
        street: " hauptstraße ",
        city: "KÖLN",
      }),
    ).toBe(true);
  });

  it("compares the PLZ by digits", () => {
    expect(addressMatches(current, { ...target, plz: "D-50667" })).toBe(true);
    expect(addressMatches(current, { ...target, plz: "50668" })).toBe(false);
  });

  it("ignores the country only when the target has none", () => {
    expect(addressMatches(current, { ...target, country: null })).toBe(true);
    expect(addressMatches(current, { ...target, country: "Spanien" })).toBe(
      false,
    );
  });

  it.each(["street", "houseNo", "city"] as const)(
    "detects a different %s",
    (key) => {
      expect(addressMatches(current, { ...target, [key]: "anders" })).toBe(
        false,
      );
    },
  );
});

describe("bankMatches", () => {
  const bank = { iban: "DE89370400440532013000", holder: "Anna Müller" };

  it("ignores spaces and case in the IBAN", () => {
    expect(
      bankMatches(bank, { iban: "de89 3704 0044 0532 0130 00", holder: null }),
    ).toBe(true);
  });

  it("ignores the holder when the target has none", () => {
    expect(bankMatches(bank, { iban: bank.iban, holder: null })).toBe(true);
  });

  it("detects a different IBAN or holder", () => {
    expect(
      bankMatches(bank, { iban: "DE02120300000000202051", holder: null }),
    ).toBe(false);
    expect(bankMatches(bank, { iban: bank.iban, holder: "Max Becker" })).toBe(
      false,
    );
  });
});
