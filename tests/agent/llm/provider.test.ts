import { describe, expect, it } from "vitest";
import { getModel } from "@/agent/llm/provider";

describe("getModel", () => {
  it("returns null in replay mode, even with a key present", () => {
    expect(
      getModel({
        provider: "replay",
        anthropicApiKey: "sk-test",
        anthropicModel: "claude-haiku-5-5",
      }),
    ).toBeNull();
  });

  it("fails clearly when anthropic is selected without a key", () => {
    expect(() =>
      getModel({ provider: "anthropic", anthropicModel: "claude-haiku-5-5" }),
    ).toThrow(expect.objectContaining({ code: "LLM_NOT_CONFIGURED" }));
  });

  it("creates an anthropic model with the configured id", () => {
    const model = getModel({
      provider: "anthropic",
      anthropicApiKey: "sk-test",
      anthropicModel: "claude-haiku-5-5",
    });
    expect(model).toMatchObject({
      provider: expect.stringContaining("anthropic"),
      modelId: "claude-haiku-5-5",
    });
  });
});
