import { describe, expect, it } from "vitest";
import { parseSearchTerm, toLikePattern } from "@/legacy/search";

describe("parseSearchTerm", () => {
  it("trims the input", () => {
    expect(parseSearchTerm("  AW-100101 ")).toBe("AW-100101");
  });

  it.each([undefined, null, "", "   ", 42, ["a"], "x".repeat(101)])(
    "returns null for %j",
    (raw) => {
      expect(parseSearchTerm(raw)).toBeNull();
    },
  );
});

describe("toLikePattern", () => {
  it("wraps the term in wildcards", () => {
    expect(toLikePattern("becker")).toBe("%becker%");
  });

  it("escapes LIKE metacharacters so they match literally", () => {
    expect(toLikePattern("50%_a\\b")).toBe("%50\\%\\_a\\\\b%");
  });
});
