import { describe, expect, it } from "vitest";
import { loadSeededCache, SeedCacheError } from "@/db/seed-cache";
import { computeCacheKey } from "@/agent/llm/cache-key";
import { loadEvalCases } from "../../evals/loader";

const entry = (key: string) => ({ key, response: { a: 1 }, model: "m" });

describe("loadSeededCache", () => {
  it("accepts the committed file and covers every eval case at the current prompt version", () => {
    const keys = new Set(loadSeededCache().map((e) => e.key));
    for (const c of loadEvalCases()) {
      expect(keys.has(computeCacheKey(c.email.subject, c.email.body))).toBe(
        true,
      );
    }
  });

  it("accepts an empty list", () => {
    expect(loadSeededCache([])).toEqual([]);
  });

  it.each([
    ["not an array", { key: "k" }],
    ["missing model", [{ key: "k", response: {} }]],
    ["unknown field", [{ ...entry("k"), extra: true }]],
    ["duplicate keys", [entry("k"), entry("k")]],
  ])("rejects %s with a typed error", (_name, raw) => {
    expect(() => loadSeededCache(raw)).toThrow(SeedCacheError);
    try {
      loadSeededCache(raw);
    } catch (error) {
      expect(error).toMatchObject({ code: "SEED_CACHE_INVALID" });
    }
  });
});
