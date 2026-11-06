import { llmFailureMessageDe } from "@/agent/llm/errors";
import { t } from "@/lib/i18n-de";

const MESSAGES_DE: Record<string, string> = {
  VERIFY_MISMATCH: t.pipeline.verifyMismatch,
};

/**
 * Stable `code` plus a German message for the UI. The raw message is only logged, never stored:
 * unexpected errors (database, network) may contain details that do not belong on a case.
 * `fields` (names of differing fields, no values) is kept when the error carries it.
 */
export function describeFailure(error: unknown): {
  code: string;
  messageDe: string;
  fields?: string[];
} {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "UNEXPECTED_ERROR";
  const fields =
    typeof error === "object" &&
    error !== null &&
    "fields" in error &&
    Array.isArray(error.fields) &&
    error.fields.every((f): f is string => typeof f === "string") &&
    error.fields.length > 0
      ? error.fields
      : undefined;
  return {
    code,
    messageDe:
      llmFailureMessageDe(error) ?? MESSAGES_DE[code] ?? t.pipeline.stepFailed,
    ...(fields ? { fields } : {}),
  };
}
