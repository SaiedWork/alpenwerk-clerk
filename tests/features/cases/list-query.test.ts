import { describe, expect, it } from "vitest";
import {
  casesHref,
  parseCasesQuery,
} from "@/features/cases/schemas/list-query";

describe("parseCasesQuery", () => {
  it("defaults to no filter and page 1", () => {
    expect(parseCasesQuery({})).toEqual({
      status: undefined,
      decision: undefined,
      page: 1,
    });
  });

  it("accepts valid filters and a page", () => {
    expect(
      parseCasesQuery({ status: "DONE", decision: "NEEDS_REVIEW", page: "3" }),
    ).toEqual({ status: "DONE", decision: "NEEDS_REVIEW", page: 3 });
  });

  it("falls back instead of failing on bad input", () => {
    expect(
      parseCasesQuery({ status: "nope", decision: ["x"], page: "-4" }),
    ).toEqual({ status: undefined, decision: undefined, page: 1 });
    expect(parseCasesQuery({ page: "abc" }).page).toBe(1);
    expect(parseCasesQuery({ page: "2.5" }).page).toBe(1);
  });

  it("uses the first value of a repeated parameter", () => {
    expect(parseCasesQuery({ status: ["FAILED", "DONE"] }).status).toBe(
      "FAILED",
    );
  });
});

describe("casesHref", () => {
  it("omits defaults", () => {
    expect(casesHref({})).toBe("/faelle");
    expect(casesHref({ page: 1 })).toBe("/faelle");
  });

  it("keeps filters and pages above one", () => {
    expect(casesHref({ status: "DONE", decision: "REPLY_ONLY", page: 2 })).toBe(
      "/faelle?status=DONE&decision=REPLY_ONLY&page=2",
    );
  });
});
