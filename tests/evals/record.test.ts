import { describe, expect, it } from "vitest";
import type { ExtractResult } from "@/agent/llm/extract";
import { loadEvalCases } from "../../evals/loader";
import { recordExtractions } from "../../evals/record";
import { cacheEntry, perfectRaw } from "./perfect-model";

const cases = loadEvalCases().slice(0, 3);

function extractor(failFor?: string) {
  const calls: string[] = [];
  const extract = async ({
    subject,
  }: {
    subject: string;
    body: string;
  }): Promise<ExtractResult> => {
    const c = cases.find((x) => x.email.subject === subject);
    if (!c) throw new Error("unknown case");
    calls.push(c.id);
    if (c.id === failFor) throw new Error("boom");
    return {
      extraction: perfectRaw(c),
      usage: { tokensIn: 1000, tokensOut: 100 },
      model: "claude-haiku-5-5",
    };
  };
  return { extract, calls };
}

describe("recordExtractions", () => {
  it("calls the model once per case and sums usage and cost", async () => {
    const { extract, calls } = extractor();
    const { entries, stats } = await recordExtractions({
      cases,
      existing: [],
      extract,
    });
    expect(calls).toEqual(cases.map((c) => c.id));
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.key)).toEqual(
      [...entries.map((e) => e.key)].sort(),
    );
    expect(stats).toMatchObject({ calls: 3, skipped: 0, tokensIn: 3000 });
    expect(stats.estCostUsd).toBeGreaterThan(0);
  });

  it("reuses existing entries unless forced", async () => {
    const existing = [cacheEntry(cases[0], perfectRaw(cases[0]))];
    const first = extractor();
    const kept = await recordExtractions({
      cases,
      existing,
      extract: first.extract,
    });
    expect(first.calls).toEqual([cases[1].id, cases[2].id]);
    expect(kept.stats.skipped).toBe(1);

    const forced = extractor();
    await recordExtractions({
      cases,
      existing,
      extract: forced.extract,
      force: true,
    });
    expect(forced.calls).toHaveLength(3);
  });

  it("drops entries of cases that no longer exist", async () => {
    const stale = { key: "stale", response: {}, model: "m" };
    const { entries } = await recordExtractions({
      cases,
      existing: [stale],
      extract: extractor().extract,
    });
    expect(entries.map((e) => e.key)).not.toContain("stale");
  });

  it("reports a failing case, keeps going and keeps the older entry", async () => {
    const old = cacheEntry(cases[1], { old: true });
    const { extract } = extractor(cases[1].id);
    const { entries, stats } = await recordExtractions({
      cases,
      existing: [old],
      extract,
      force: true,
    });
    expect(stats.failures).toEqual([{ id: cases[1].id, message: "boom" }]);
    expect(stats.calls).toBe(2);
    expect(entries).toContainEqual(old);
    expect(entries).toHaveLength(3);
  });
});
