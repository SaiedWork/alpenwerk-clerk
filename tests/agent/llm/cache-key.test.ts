import { describe, expect, it, vi } from "vitest";
import { computeCacheKey } from "@/agent/llm/cache-key";

describe("computeCacheKey", () => {
  it("is a stable sha256 hex string", () => {
    const key = computeCacheKey("Betreff", "Text");
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(computeCacheKey("Betreff", "Text")).toBe(key);
  });

  it("ignores whitespace differences", () => {
    expect(computeCacheKey(" Betreff ", "Zeile 1\n\nZeile   2 ")).toBe(
      computeCacheKey("Betreff", "Zeile 1 Zeile 2"),
    );
  });

  it("changes with the text", () => {
    expect(computeCacheKey("a", "b")).not.toBe(computeCacheKey("a", "c"));
  });

  it("does not confuse subject and body boundaries", () => {
    expect(computeCacheKey("ab", "c")).not.toBe(computeCacheKey("a", "bc"));
  });

  it("changes when the prompt or schema version changes", async () => {
    const before = computeCacheKey("a", "b");
    vi.resetModules();
    vi.doMock("@/agent/llm/prompt", () => ({ PROMPT_VERSION: "other" }));
    const promptBumped = (await import("@/agent/llm/cache-key"))
      .computeCacheKey;
    expect(promptBumped("a", "b")).not.toBe(before);
    vi.doUnmock("@/agent/llm/prompt");

    vi.resetModules();
    vi.doMock("@/agent/llm/schema", () => ({ SCHEMA_VERSION: "other" }));
    const schemaBumped = (await import("@/agent/llm/cache-key"))
      .computeCacheKey;
    expect(schemaBumped("a", "b")).not.toBe(before);
    vi.doUnmock("@/agent/llm/schema");
  });
});
