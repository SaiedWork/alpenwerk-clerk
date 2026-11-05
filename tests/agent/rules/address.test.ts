import { describe, expect, it } from "vitest";
import { addressRules } from "@/agent/rules/address";
import type { ExtractedAddress } from "@/agent/rules/types";
import { input } from "./fixtures";

const full: ExtractedAddress = {
  street: "Neue Straße",
  houseNo: "7a",
  plz: "50667",
  city: "Köln",
  country: null,
};

const codes = (address: ExtractedAddress | null) =>
  addressRules(input({ address })).map((r) => r.code);

describe("addressRules", () => {
  it("passes a complete German address (country omitted)", () => {
    expect(codes(full)).toEqual([]);
  });

  it("passes with country Deutschland in any spelling", () => {
    for (const country of ["Deutschland", " germany ", "DE"]) {
      expect(codes({ ...full, country })).toEqual([]);
    }
  });

  it("does nothing when there is no address extraction", () => {
    expect(codes(null)).toEqual([]);
  });

  describe("ADDR_INCOMPLETE (block)", () => {
    it.each([
      ["street", { street: null }],
      ["house number", { houseNo: null }],
      ["PLZ", { plz: null }],
      ["city", { city: null }],
      ["blank city", { city: "  " }],
    ])("missing %s", (_name, patch) => {
      const results = addressRules(input({ address: { ...full, ...patch } }));
      expect(results.map((r) => r.code)).toContain("ADDR_INCOMPLETE");
      expect(results.find((r) => r.code === "ADDR_INCOMPLETE")?.severity).toBe(
        "block",
      );
    });

    it("a missing PLZ is not also reported as invalid", () => {
      expect(codes({ ...full, plz: null })).toEqual(["ADDR_INCOMPLETE"]);
    });
  });

  describe("ADDR_PLZ_INVALID (block)", () => {
    it.each([
      ["5066", true],
      ["506671", true],
      ["5066a", true],
      ["50667", false],
      ["D-50667", false], // normalized to digits first
    ])("PLZ %s -> invalid %s", (plz, invalid) => {
      expect(codes({ ...full, plz }).includes("ADDR_PLZ_INVALID")).toBe(
        invalid,
      );
    });

    it("is reported together with other problems", () => {
      expect(codes({ ...full, plz: "5066", houseNo: null })).toEqual([
        "ADDR_INCOMPLETE",
        "ADDR_PLZ_INVALID",
      ]);
    });
  });

  describe("ADDR_NON_DE (escalate)", () => {
    it("escalates a Spanish address and skips the German PLZ format", () => {
      const results = addressRules(
        input({ address: { ...full, plz: "28013", country: "Spanien" } }),
      );
      expect(results).toEqual([
        expect.objectContaining({ code: "ADDR_NON_DE", severity: "escalate" }),
      ]);
      expect(codes({ ...full, plz: "2801", country: "Spain" })).toEqual([
        "ADDR_NON_DE",
      ]);
    });
  });
});
