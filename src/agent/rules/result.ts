import { t } from "@/lib/i18n-de";
import type { RuleCode, RuleResult, Severity } from "./types";

/** Builds a rule result with the German explanation from the dictionary. */
export function ruleResult(code: RuleCode, severity: Severity): RuleResult {
  return { code, severity, messageDe: t.rules[code] };
}
