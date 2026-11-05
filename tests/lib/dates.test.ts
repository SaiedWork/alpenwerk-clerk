import { describe, expect, it } from "vitest";
import { berlinDateIso, endOfMonthBerlinIso } from "@/lib/dates";

describe("berlinDateIso", () => {
  it("uses the Berlin calendar day, not the UTC day", () => {
    // 23:30 UTC on 31 Jan is already 1 Feb in Berlin (UTC+1).
    expect(berlinDateIso(new Date("2026-01-31T23:30:00Z"))).toBe("2026-02-01");
    // 22:30 UTC on 30 Jun is already 1 Jul in Berlin (UTC+2, summer time).
    expect(berlinDateIso(new Date("2026-06-30T22:30:00Z"))).toBe("2026-07-01");
  });
});

describe("endOfMonthBerlinIso", () => {
  it.each([
    ["2026-11-05T10:00:00Z", "2026-11-30"],
    ["2026-01-15T10:00:00Z", "2026-01-31"],
    ["2026-02-10T10:00:00Z", "2026-02-28"],
    ["2028-02-10T10:00:00Z", "2028-02-29"], // leap year
    ["2026-12-31T10:00:00Z", "2026-12-31"], // already the last day
  ])("%s -> %s", (input, expected) => {
    expect(endOfMonthBerlinIso(new Date(input))).toBe(expected);
  });

  it("rolls into the next month when Berlin is already past midnight", () => {
    expect(endOfMonthBerlinIso(new Date("2026-01-31T23:30:00Z"))).toBe(
      "2026-02-28",
    );
  });
});
