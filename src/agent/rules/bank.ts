import { isGermanIban, isValidIban, normalizeIban } from "@/lib/iban";
import { isWithinLastDays } from "@/lib/dates";
import { namesMatch } from "@/lib/normalize";
import { ruleResult } from "./result";
import type { RuleInput, RuleResult } from "./types";

const RECENT_ADDRESS_CHANGE_DAYS = 14;

/**
 * Bank change rules. A missing IBAN is reported as invalid so the reply asks for it.
 * The non-DE and same-IBAN checks only make sense for a valid IBAN. Unlike the identify
 * rules, a missing account holder escalates: a payout account must be positively confirmed.
 */
export function bankRules(input: RuleInput): RuleResult[] {
  const { bank, snapshot, now } = input;
  if (!bank || !snapshot) return [];

  const results: RuleResult[] = [];
  const iban = bank.iban ? normalizeIban(bank.iban) : "";

  if (!isValidIban(iban)) {
    results.push(ruleResult("BANK_IBAN_INVALID", "block"));
  } else {
    if (!isGermanIban(iban))
      results.push(ruleResult("BANK_NON_DE", "escalate"));
    if (
      snapshot.activeMandate &&
      iban === normalizeIban(snapshot.activeMandate.iban)
    ) {
      results.push(ruleResult("BANK_SAME_IBAN", "block"));
    }
  }

  const policyholder = `${snapshot.firstName} ${snapshot.lastName}`;
  if (!bank.accountHolder || !namesMatch(bank.accountHolder, policyholder)) {
    results.push(ruleResult("BANK_HOLDER_MISMATCH", "escalate"));
  }
  if (!snapshot.activeMandate) {
    results.push(ruleResult("BANK_NO_MANDATE", "escalate"));
  }
  if (
    snapshot.lastAddressChangeAt &&
    isWithinLastDays(
      snapshot.lastAddressChangeAt,
      now,
      RECENT_ADDRESS_CHANGE_DAYS,
    )
  ) {
    results.push(ruleResult("BANK_RECENT_ADDRESS_CHANGE", "escalate"));
  }
  return results;
}
