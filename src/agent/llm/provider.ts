import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import { LlmError } from "./errors";

export interface ProviderConfig {
  provider: "anthropic" | "replay";
  anthropicApiKey?: string;
  anthropicModel: string;
}

/**
 * Model for live calls. `null` in replay mode: callers must answer from the cache only.
 * Config is passed in (from `env` by the caller) so this stays testable.
 */
export function getModel(config: ProviderConfig): LanguageModel | null {
  if (config.provider === "replay") return null;
  if (!config.anthropicApiKey) {
    throw new LlmError(
      "LLM_NOT_CONFIGURED",
      "LLM_PROVIDER=anthropic requires ANTHROPIC_API_KEY",
    );
  }
  return createAnthropic({ apiKey: config.anthropicApiKey })(
    config.anthropicModel,
  );
}
