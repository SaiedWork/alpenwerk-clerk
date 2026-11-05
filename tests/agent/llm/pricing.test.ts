import { describe, expect, it } from "vitest";
import { estimateCostUsd, PRICES_CHECKED_ON } from "@/agent/llm/pricing";

describe("estimateCostUsd", () => {
  it("prices Haiku 5.5 per million tokens", () => {
    // 1M in at $0.10 + 1M out at $0.50
    expect(estimateCostUsd("claude-haiku-5-5", 1_000_000, 1_000_000)).toBe(0.6);
    // a typical case: 900 in, 150 out
    expect(estimateCostUsd("claude-haiku-5-5", 900, 150)).toBe(0.000165);
  });

  it("matches provider ids with a date suffix", () => {
    expect(estimateCostUsd("claude-haiku-5-5-20261001", 1_000_000, 0)).toBe(
      0.1,
    );
  });

  it("is 0 for zero tokens and for unknown models", () => {
    expect(estimateCostUsd("claude-haiku-5-5", 0, 0)).toBe(0);
    expect(estimateCostUsd("some-other-model", 1000, 1000)).toBe(0);
  });

  it("records when the prices were last checked", () => {
    expect(PRICES_CHECKED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
