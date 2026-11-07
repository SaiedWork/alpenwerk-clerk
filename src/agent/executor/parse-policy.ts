import type { LegacySnapshot, PolicyStatus } from "@/agent/rules/types";
import { parseFlexibleDate } from "@/lib/dates";
import { LegacyDriverError } from "./errors";

/**
 * What the browser pulled out of the policy page, as plain strings. Produced by
 * `extractPolicyPage` inside the page, turned into a snapshot by `parsePolicyPage`. The split
 * keeps the browser part trivial and the interpretation pure and testable.
 */
export interface RawPolicyPage {
  /** Text of the single-value cells, keyed by `data-testid`; `null` if the cell is missing. */
  texts: Record<RawTextKey, string | null>;
  /** The mandate with status `aktiv`, if the page shows one. */
  activeMandate: { iban: string | null; holder: string | null } | null;
  /** Change-log rows: ISO instant from the `<time datetime>` attribute, and the field name. */
  changes: { at: string | null; field: string | null }[];
}

export const RAW_TEXT_KEYS = [
  "customer-name",
  "customer-birthdate",
  "customer-email",
  "policy-no",
  "policy-status",
  "policy-surrender-value",
  "policy-irrevocable",
] as const;
type RawTextKey = (typeof RAW_TEXT_KEYS)[number];

const STATUSES: readonly PolicyStatus[] = ["aktiv", "ruhend", "storniert"];
const SALUTATIONS = new Set(["herr", "frau", "divers", "dr.", "prof."]);

function required(raw: RawPolicyPage, key: RawTextKey): string {
  const value = raw.texts[key]?.trim();
  if (!value) {
    throw new LegacyDriverError(
      "LEGACY_PARSE_FAILED",
      `Policy page has no value for "${key}".`,
    );
  }
  return value;
}

/**
 * The page shows "Frau Dr. Anna Müller Schmidt" in one cell. Salutation and titles are dropped,
 * the last word is the last name. The rule engine compares first and last name joined as token
 * sets, so an ambiguous split of double names does not change any decision.
 */
function splitName(display: string): { firstName: string; lastName: string } {
  const words = display
    .split(/\s+/)
    .filter((w) => w !== "" && !SALUTATIONS.has(w.toLowerCase()));
  if (words.length < 2) {
    throw new LegacyDriverError(
      "LEGACY_PARSE_FAILED",
      "Customer name on the policy page has fewer than two words.",
    );
  }
  return {
    firstName: words.slice(0, -1).join(" "),
    lastName: words[words.length - 1],
  };
}

/** German amount as displayed ("1.234,56 €") to a number; `null` for an empty cell. */
function parseEuro(text: string | null): number | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  const value = Number(trimmed.replace(/[^\d,-]/g, "").replace(",", "."));
  if (!/\d/.test(trimmed) || !Number.isFinite(value)) {
    throw new LegacyDriverError(
      "LEGACY_PARSE_FAILED",
      `Unreadable amount: "${trimmed}".`,
    );
  }
  return value;
}

function latestAddressChange(raw: RawPolicyPage): Date | null {
  const times = raw.changes
    .filter((c) => c.field === "adresse" && c.at)
    .map((c) => new Date(c.at as string).getTime())
    .filter((ms) => !Number.isNaN(ms));
  return times.length > 0 ? new Date(Math.max(...times)) : null;
}

/** Interprets the raw page into the snapshot the rule engine reads. Throws on a malformed page. */
export function parsePolicyPage(
  raw: RawPolicyPage,
  now: Date = new Date(),
): LegacySnapshot {
  const status = required(raw, "policy-status") as PolicyStatus;
  if (!STATUSES.includes(status)) {
    throw new LegacyDriverError(
      "LEGACY_PARSE_FAILED",
      `Unknown policy status "${status}".`,
    );
  }
  const dateOfBirth = parseFlexibleDate(
    required(raw, "customer-birthdate"),
    now,
  );
  if (!dateOfBirth) {
    throw new LegacyDriverError(
      "LEGACY_PARSE_FAILED",
      "Unreadable date of birth on the policy page.",
    );
  }
  const mandate = raw.activeMandate;
  return {
    policyNo: required(raw, "policy-no"),
    status,
    ...splitName(required(raw, "customer-name")),
    dateOfBirth,
    email: required(raw, "customer-email"),
    activeMandate:
      mandate?.iban && mandate.holder
        ? { iban: mandate.iban.trim(), holder: mandate.holder.trim() }
        : null,
    lastAddressChangeAt: latestAddressChange(raw),
    irrevocableBeneficiary:
      required(raw, "policy-irrevocable").toLowerCase() === "ja",
    surrenderValueIndicative: parseEuro(raw.texts["policy-surrender-value"]),
  };
}
