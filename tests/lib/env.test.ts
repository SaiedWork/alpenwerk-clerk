import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

describe("parseEnv", () => {
  it("applies defaults for an empty environment", () => {
    const env = parseEnv({});
    expect(env.LLM_PROVIDER).toBe("replay");
    expect(env.LLM_DAILY_CALL_CAP).toBe(150);
    expect(env.ANTHROPIC_MODEL).toBe("claude-haiku-5-5");
  });

  it("coerces numeric strings", () => {
    expect(parseEnv({ LLM_DAILY_CALL_CAP: "42" }).LLM_DAILY_CALL_CAP).toBe(42);
  });

  it("treats empty strings as unset", () => {
    const env = parseEnv({ DATABASE_URL: "", LLM_DAILY_CALL_CAP: "" });
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.LLM_DAILY_CALL_CAP).toBe(150);
  });

  it("throws a readable error for invalid values", () => {
    expect(() => parseEnv({ LLM_PROVIDER: "gpt" })).toThrow(
      /Invalid environment variables[\s\S]*LLM_PROVIDER/,
    );
    expect(() => parseEnv({ LLM_DAILY_CALL_CAP: "-1" })).toThrow(
      /LLM_DAILY_CALL_CAP/,
    );
  });
});
