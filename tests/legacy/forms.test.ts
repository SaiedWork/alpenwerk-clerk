import { describe, expect, it } from "vitest";
import {
  addressFormSchema,
  bankFormSchema,
  firstInvalidField,
  parseErrorField,
} from "@/legacy/forms";

const validAddress = {
  strasse: "Hauptstraße",
  hausnr: "12a",
  plz: "50667",
  ort: "Köln",
  land: "Deutschland",
};

describe("addressFormSchema", () => {
  it("accepts a valid address and collapses whitespace", () => {
    const result = addressFormSchema.parse({
      ...validAddress,
      strasse: "  Hauptstraße   ",
    });
    expect(result.strasse).toBe("Hauptstraße");
  });

  it.each(["strasse", "hausnr", "plz", "ort", "land"] as const)(
    "rejects an empty %s",
    (field) => {
      const result = addressFormSchema.safeParse({
        ...validAddress,
        [field]: "  ",
      });
      expect(result.success).toBe(false);
      if (!result.success) expect(firstInvalidField(result.error)).toBe(field);
    },
  );

  it("requires 5 digits for a German PLZ", () => {
    for (const plz of ["5066", "506678", "5066a"]) {
      const result = addressFormSchema.safeParse({ ...validAddress, plz });
      expect(result.success).toBe(false);
      if (!result.success) expect(firstInvalidField(result.error)).toBe("plz");
    }
  });

  it("accepts any PLZ format outside Germany", () => {
    expect(
      addressFormSchema.safeParse({
        ...validAddress,
        land: "Spanien",
        plz: "28001",
      }).success,
    ).toBe(true);
    expect(
      addressFormSchema.safeParse({
        ...validAddress,
        land: "Spanien",
        plz: "E-28001",
      }).success,
    ).toBe(true);
  });
});

describe("bankFormSchema", () => {
  it("normalizes spaces and case of the IBAN", () => {
    const result = bankFormSchema.parse({
      iban: "de89 3704 0044 0532 0130 00",
      kontoinhaber: "Max Muster",
    });
    expect(result.iban).toBe("DE89370400440532013000");
  });

  it("does not enforce the IBAN checksum or the country (rule engine's job)", () => {
    expect(
      bankFormSchema.safeParse({
        iban: "DE00370400440532013000",
        kontoinhaber: "A",
      }).success,
    ).toBe(true);
    expect(
      bankFormSchema.safeParse({
        iban: "ES9121000418450200051332",
        kontoinhaber: "A",
      }).success,
    ).toBe(true);
  });

  it.each(["", "DE89", "1234567890123456", "DE89 3704 0044 0532 0130 0!"])(
    "rejects malformed IBAN %j",
    (iban) => {
      const result = bankFormSchema.safeParse({ iban, kontoinhaber: "A" });
      expect(result.success).toBe(false);
      if (!result.success) expect(firstInvalidField(result.error)).toBe("iban");
    },
  );

  it("accepts a holder different from the policyholder and rejects an empty one", () => {
    expect(
      bankFormSchema.safeParse({
        iban: "DE89370400440532013000",
        kontoinhaber: "Erika Muster",
      }).success,
    ).toBe(true);
    expect(
      bankFormSchema.safeParse({
        iban: "DE89370400440532013000",
        kontoinhaber: " ",
      }).success,
    ).toBe(false);
  });
});

describe("parseErrorField", () => {
  it("only accepts known field names", () => {
    expect(parseErrorField("plz")).toBe("plz");
    expect(parseErrorField("<script>")).toBeNull();
    expect(parseErrorField(undefined)).toBeNull();
  });
});
