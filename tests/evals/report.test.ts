import { describe, expect, it } from "vitest";
import { formatReport } from "../../evals/report";
import { errorResult, summarize } from "../../evals/score";
import { loadEvalCases } from "../../evals/loader";

describe("formatReport", () => {
  it("lists failures and percentages", () => {
    const [c] = loadEvalCases();
    if (!c) throw new Error("no cases");
    const results = [errorResult(c, "no cached extraction")];
    const text = formatReport(results, summarize(results));
    expect(text).toContain(`${c.id}: no cached extraction`);
    expect(text).toContain("Decision accuracy:     0.0%");
    expect(text).toContain("1 without extraction");
  });
});
