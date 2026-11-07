import {
  generateText,
  NoObjectGeneratedError,
  Output,
  type LanguageModel,
} from "ai";
import { LlmError } from "./errors";
import { buildUserMessage, SYSTEM_PROMPT } from "./prompt";
import type { Extraction } from "./schema";
import { wireSchema, wireToExtraction } from "./wire";

/** Per-step timeout for the live call (HANDOFF §7). */
const LLM_TIMEOUT_MS = 20_000;

export interface ExtractResult {
  extraction: Extraction;
  usage: { tokensIn: number; tokensOut: number };
  /** Model id reported by the provider, falls back to the configured one. */
  model: string;
}

/**
 * One live LLM call: email in, validated extraction out. Never falls back silently: every failure
 * is a typed `LlmError`. The sender address is deliberately not sent to the model.
 */
export async function extractFromEmail(options: {
  subject: string;
  body: string;
  model: LanguageModel;
  timeoutMs?: number;
}): Promise<ExtractResult> {
  const { subject, body, model, timeoutMs = LLM_TIMEOUT_MS } = options;
  // Throws LlmInputError for oversize input before any network call.
  const prompt = buildUserMessage(subject, body);

  let result;
  try {
    result = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt,
      output: Output.object({ schema: wireSchema }),
      timeout: timeoutMs,
      maxRetries: 1,
    });
  } catch (error) {
    throw classify(error);
  }

  const parsed = wireToExtraction(result.output);
  if (!parsed.success) {
    throw new LlmError("LLM_OUTPUT_INVALID", "Model output failed validation", {
      details: parsed.error.issues,
    });
  }
  return {
    extraction: parsed.data,
    usage: {
      tokensIn: result.usage.inputTokens ?? 0,
      tokensOut: result.usage.outputTokens ?? 0,
    },
    model: result.response.modelId,
  };
}

function classify(error: unknown): LlmError {
  if (NoObjectGeneratedError.isInstance(error)) {
    return new LlmError(
      "LLM_OUTPUT_INVALID",
      "Model output was not valid JSON for the schema",
      {
        cause: error,
      },
    );
  }
  if (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  ) {
    return new LlmError("LLM_TIMEOUT", "LLM call timed out", { cause: error });
  }
  return new LlmError("LLM_PROVIDER_ERROR", "LLM provider call failed", {
    cause: error,
  });
}
