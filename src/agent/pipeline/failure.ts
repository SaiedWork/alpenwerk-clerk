import { llmFailureMessageDe } from "@/agent/llm/errors";
import { t } from "@/lib/i18n-de";

/**
 * Stable `code` plus a German message for the UI. The raw message is only logged, never stored:
 * unexpected errors (database, network) may contain details that do not belong on a case.
 */
export function describeFailure(error: unknown): {
  code: string;
  messageDe: string;
} {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "UNEXPECTED_ERROR";
  return {
    code,
    messageDe: llmFailureMessageDe(error) ?? t.pipeline.stepFailed,
  };
}
