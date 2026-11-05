import { describe, expect, it } from "vitest";
import { bankRules } from "@/agent/rules/bank";
import { decide } from "@/agent/rules/decide";
import type { ExtractedBank, LegacySnapshot } from "@/agent/rules/types";
import { input, NOW, snapshot } from "./fixtures";

// Valid sample IBANs: DE (different from the one on file), GB, and the one on file.
const NEW_DE = "DE89370400440532013000";
const FILE_DE = "DE02120300000000202051";
const GB = "GB82WEST12345698765432";

const clean: ExtractedBank = {
  iban: NEW_DE,
  accountHolder: "Anna Müller-Schmidt",
};

const run = (bank: ExtractedBank | null, snap: LegacySnapshot = snapshot) =>
  bankRules(input({ bank, snapshot: snap, primaryIntent: "bank_change" })).map(
    (r) => r.code,
  );

const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000);

describe("bankRules", () => {
  it("passes a clean change (B01)", () => {
    expect(run(clean)).toEqual([]);
  });

  it("does nothing without a bank extraction", () => {
    expect(run(null)).toEqual([]);
  });

  describe("BANK_IBAN_INVALID (block)", () => {
    it.each([
      ["checksum fails (B03)", "DE89370400440532013001"],
      ["too short", "DE8937040044"],
      ["missing", null],
    ])("%s", (_name, iban) => {
      const results = bankRules(
        input({ bank: { ...clean, iban }, primaryIntent: "bank_change" }),
      );
      expect(results.map((r) => r.code)).toEqual(["BANK_IBAN_INVALID"]);
      expect(results[0].severity).toBe("block");
    });

    it("accepts lowercase IBAN with spaces (B02)", () => {
      expect(run({ ...clean, iban: "de89 3704 0044 0532 0130 00" })).toEqual(
        [],
      );
    });
  });

  it("BANK_NON_DE escalates a valid foreign IBAN (B06)", () => {
    expect(run({ ...clean, iban: GB })).toEqual(["BANK_NON_DE"]);
  });

  describe("BANK_HOLDER_MISMATCH (escalate)", () => {
    it.each([
      ["spouse (B04)", "Peter Müller-Schmidt", true],
      ["variant spelling", "Mueller Schmidt, Anna", false],
      ["missing", null, true],
    ])("%s", (_name, accountHolder, mismatch) => {
      expect(
        run({ ...clean, accountHolder }).includes("BANK_HOLDER_MISMATCH"),
      ).toBe(mismatch);
    });
  });

  it("BANK_NO_MANDATE escalates when no active mandate exists (B05)", () => {
    expect(run(clean, { ...snapshot, activeMandate: null })).toEqual([
      "BANK_NO_MANDATE",
    ]);
  });

  describe("BANK_SAME_IBAN (block)", () => {
    it("blocks when the IBAN equals the one on file, ignoring spaces and case", () => {
      const codes = run({ ...clean, iban: "de02 1203 0000 0000 2020 51" });
      expect(codes).toEqual(["BANK_SAME_IBAN"]);
      expect(FILE_DE).toBe(snapshot.activeMandate?.iban);
    });
  });

  describe("BANK_RECENT_ADDRESS_CHANGE (escalate)", () => {
    it.each([
      [5, true], // B08
      [14, true],
      [15, false],
    ])("address changed %d days ago -> %s", (days, recent) => {
      const snap = { ...snapshot, lastAddressChangeAt: daysAgo(days) };
      expect(run(clean, snap).includes("BANK_RECENT_ADDRESS_CHANGE")).toBe(
        recent,
      );
    });
  });

  it("X02: injected instructions cannot lift a holder mismatch", () => {
    // The rules only see structured values; the mismatch decides, whatever the email said.
    const results = bankRules(
      input({
        bank: { ...clean, accountHolder: "Fremder Dritter" },
        primaryIntent: "bank_change",
      }),
    );
    expect(decide(results, "bank_change")).toBe("NEEDS_REVIEW");
    expect(results.map((r) => r.code)).toEqual(["BANK_HOLDER_MISMATCH"]);
  });

  it("decides block over escalate when both apply", () => {
    const results = bankRules(
      input({
        bank: { iban: "DE89370400440532013001", accountHolder: "Fremder" },
        primaryIntent: "bank_change",
      }),
    );
    expect(decide(results, "bank_change")).toBe("REPLY_ONLY");
  });
});
