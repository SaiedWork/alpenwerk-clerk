import { describe, expect, it } from "vitest";
import {
  berlinDateIso,
  endOfMonthBerlinIso,
  formatCalendarDate,
  formatDateTime,
  isoDaysBetween,
  isWithinLastDays,
  parseIsoDate,
} from "@/lib/dates";

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

describe("parseIsoDate", () => {
  it.each([
    ["2026-11-05", "2026-11-05"],
    ["2028-02-29", "2028-02-29"], // leap day
    ["2026-02-29", null], // not a leap year
    ["2026-02-30", null],
    ["2026-13-01", null],
    ["2026-00-10", null],
    ["2026-4-5", null],
    ["05.11.2026", null],
    ["2026-11-05T10:00:00Z", null],
    ["", null],
  ])("%j -> %j", (raw, expected) => {
    expect(parseIsoDate(raw)).toBe(expected);
  });
});

describe("isoDaysBetween", () => {
  it.each([
    ["2026-11-05", "2026-11-05", 0],
    ["2026-11-05", "2026-11-19", 14],
    ["2026-11-19", "2026-11-05", -14],
    ["2026-02-27", "2026-03-02", 3],
    ["2028-02-27", "2028-03-02", 4], // leap year
    ["2026-03-28", "2026-03-30", 2], // across the DST switch
    ["2025-12-31", "2026-01-01", 1],
  ])("%s -> %s = %d", (from, to, expected) => {
    expect(isoDaysBetween(from, to)).toBe(expected);
  });

  it("throws on invalid input", () => {
    expect(() => isoDaysBetween("2026-02-30", "2026-03-01")).toThrow(
      RangeError,
    );
  });
});

describe("isWithinLastDays", () => {
  const now = new Date("2026-11-19T10:00:00Z");

  it.each([
    ["2026-11-19T08:00:00Z", true], // today
    ["2026-11-14T10:00:00Z", true], // 5 days ago
    ["2026-11-05T23:30:00Z", true], // 14 days ago in Berlin (already 6 Nov)
    ["2026-11-05T10:00:00Z", true], // exactly 14 days: inclusive boundary
    ["2026-11-04T10:00:00Z", false], // 15 days ago
    ["2026-11-20T10:00:00Z", false], // in the future
  ])("%s -> %s", (instant, expected) => {
    expect(isWithinLastDays(new Date(instant), now, 14)).toBe(expected);
  });
});

describe("formatDateTime / formatCalendarDate", () => {
  it("shows instants in Berlin time", () => {
    expect(formatDateTime(new Date("2026-01-15T10:30:00Z"))).toBe(
      "15.01.26, 11:30:00",
    );
    expect(formatDateTime(new Date("2026-07-15T10:30:00Z"))).toBe(
      "15.07.26, 12:30:00",
    );
  });

  it("formats calendar dates without timezone shift", () => {
    expect(formatCalendarDate("2026-11-05")).toBe("05.11.2026");
  });
});
