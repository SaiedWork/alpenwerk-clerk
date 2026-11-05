import { describe, expect, it } from "vitest";
import {
  nameTokens,
  namesMatch,
  normalizeName,
  normalizePlz,
  normalizePolicyNo,
  normalizeText,
  textOrNull,
} from "@/lib/normalize";

describe("normalizeText", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeText("  Hauptstr.   12 \n")).toBe("Hauptstr. 12");
  });
});

describe("normalizePlz", () => {
  it.each([
    ["50667", "50667"],
    [" 50667 ", "50667"],
    ["D-50667", "50667"],
    ["5066", "5066"],
    ["abc", ""],
  ])("%j -> %j", (raw, expected) => {
    expect(normalizePlz(raw)).toBe(expected);
  });
});

describe("normalizeName", () => {
  it.each([
    ["Müller-Schmidt", "mueller schmidt"],
    ["Groß", "gross"],
    ["Özdemir", "oezdemir"],
    ["Łukasz Kowalski", "lukasz kowalski"],
    ["Şahin Çelik", "sahin celik"],
    ["Ağaoğlu", "agaoglu"],
    ["  Anna   Maria ", "anna maria"],
  ])("%j -> %j", (raw, expected) => {
    expect(normalizeName(raw)).toBe(expected);
  });
});

describe("nameTokens", () => {
  it("drops titles and sorts tokens", () => {
    expect(nameTokens("Dr. Anna Müller")).toEqual(["anna", "mueller"]);
  });
});

describe("namesMatch", () => {
  it.each([
    ["Anna Müller", "Mueller, Anna", true],
    ["Müller-Schmidt", "Mueller Schmidt", true],
    ["Dr. Anna Müller", "Anna Müller", true],
    ["Straße", "Strasse", true],
    ["ANNA MÜLLER", "anna müller", true],
    ["Anna Müller", "Peter Müller", false],
    ["Anna Müller", "Anna", false],
    ["Anna", "", false],
    ["", "", false],
  ])("%j vs %j -> %s", (a, b, expected) => {
    expect(namesMatch(a, b)).toBe(expected);
  });
});

describe("textOrNull / normalizePolicyNo", () => {
  it("returns null for empty or missing text", () => {
    expect(textOrNull(null)).toBeNull();
    expect(textOrNull("   ")).toBeNull();
    expect(textOrNull("  Köln \n ")).toBe("Köln");
  });

  it.each([
    ["AW-100101", "AW-100101"],
    ["aw100101", "AW-100101"],
    [" aw 100101 ", "AW-100101"],
    ["XY-9", "XY-9"],
    ["Police 4711", "POLICE4711"],
  ])("normalizes policy number %s", (raw, expected) => {
    expect(normalizePolicyNo(raw)).toBe(expected);
  });
});
