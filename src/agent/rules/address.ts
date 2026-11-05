import { normalizePlz } from "@/lib/normalize";
import { ruleResult } from "./result";
import type { RuleInput, RuleResult } from "./types";

const GERMANY = new Set([
  "deutschland",
  "germany",
  "de",
  "bundesrepublik deutschland",
]);

const isGermany = (country: string) =>
  GERMANY.has(country.trim().toLowerCase());

const blank = (value: string | null) => value === null || value.trim() === "";

/**
 * Address change rules. A missing country means Germany (the customer is already insured
 * here). The 5-digit PLZ check only applies to German addresses, so a Spanish address is
 * escalated for review instead of being blocked by a German format rule.
 */
export function addressRules(input: RuleInput): RuleResult[] {
  const { address } = input;
  if (!address) return [];

  const results: RuleResult[] = [];
  const nonDe = !blank(address.country) && !isGermany(address.country ?? "");

  if (
    blank(address.street) ||
    blank(address.houseNo) ||
    blank(address.plz) ||
    blank(address.city)
  ) {
    results.push(ruleResult("ADDR_INCOMPLETE", "block"));
  }
  if (
    !nonDe &&
    !blank(address.plz) &&
    !/^\d{5}$/.test(normalizePlz(address.plz ?? ""))
  ) {
    results.push(ruleResult("ADDR_PLZ_INVALID", "block"));
  }
  if (nonDe) results.push(ruleResult("ADDR_NON_DE", "escalate"));
  return results;
}
