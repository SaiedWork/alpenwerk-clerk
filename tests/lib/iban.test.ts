import { describe, expect, it } from "vitest";
import { isGermanIban, isValidIban, maskIban, normalizeIban } from "@/lib/iban";

describe("normalizeIban", () => {
  it.each([
    ["DE89 3704 0044 0532 0130 00", "DE89370400440532013000"],
    ["de89 3704  0044 0532 0130 00 ", "DE89370400440532013000"],
    ["de89\t37040044\n0532013000", "DE89370400440532013000"],
  ])("%j -> %s", (raw, expected) => {
    expect(normalizeIban(raw)).toBe(expected);
  });
});

describe("isValidIban", () => {
  it.each([
    ["DE89 3704 0044 0532 0130 00", true],
    ["de89 3704 0044 0532 0130 00", true],
    ["GB82 WEST 1234 5698 7654 32", true],
    ["ES91 2100 0418 4502 0005 1332", true],
    ["DE89 3704 0044 0532 0130 01", false], // checksum off
    ["DE88 3704 0044 0532 0130 00", false], // check digits off
    ["DE89 3704 0044 0532 0130", false], // too short
    ["1234 5678", false],
    ["", false],
    ["DE89-3704-0044-0532-0130-00", false],
  ])("%j -> %s", (raw, expected) => {
    expect(isValidIban(raw)).toBe(expected);
  });
});

describe("isGermanIban", () => {
  it.each([
    ["DE89 3704 0044 0532 0130 00", true],
    ["de89370400440532013000", true],
    ["GB82 WEST 1234 5698 7654 32", false],
    ["DE89 3704 0044 0532 0130", false], // wrong length
    ["DE89 3704 0044 0532 0130 000", false],
  ])("%j -> %s", (raw, expected) => {
    expect(isGermanIban(raw)).toBe(expected);
  });
});

describe("maskIban", () => {
  it("masks a German IBAN as required for replies", () => {
    expect(maskIban("de89 3704 0044 0532 0130 00")).toBe(
      "DE89 **** **** **** **** 00",
    );
  });

  it("never reveals the middle part", () => {
    expect(maskIban("DE89370400440532013000")).not.toContain("3704");
  });

  it("handles very short input safely", () => {
    expect(maskIban("DE1")).toBe("****");
  });
});
