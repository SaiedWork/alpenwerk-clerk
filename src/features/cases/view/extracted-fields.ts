import type { NormalizedExtraction } from "@/agent/llm/normalize";
import { maskIban } from "@/lib/iban";
import { formatCalendarDate } from "@/lib/dates";
import { t } from "@/lib/i18n-de";

const f = t.console.case.fields;

/** ISO dates are shown in German format; anything else is shown as stored, never thrown on. */
function showDate(value: string | null): string | null {
  if (!value) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatCalendarDate(value) : value;
}

export type ExtractedField = { label: string; value: string };

/**
 * The extraction as label/value rows for the UI. Empty values are left out and the IBAN
 * is always masked: the full number never reaches the browser.
 */
export function extractedFields(e: NormalizedExtraction): ExtractedField[] {
  const rows: [string, string | null][] = [
    [f.policyNo, e.policyNo],
    [f.senderName, e.identity.senderName],
    [f.dateOfBirth, showDate(e.identity.dateOfBirth)],
    [f.language, t.console.case.languages[e.language]],
    [f.intent, t.console.intent[e.primaryIntent]],
    [
      f.extraIntents,
      e.intents
        .filter((i) => i !== e.primaryIntent)
        .map((i) => t.console.intent[i])
        .join(", ") || null,
    ],
    [f.street, e.address?.street ?? null],
    [f.houseNo, e.address?.houseNo ?? null],
    [f.plz, e.address?.plz ?? null],
    [f.city, e.address?.city ?? null],
    [f.country, e.address?.country ?? null],
    [f.iban, e.bank?.iban ? maskIban(e.bank.iban) : null],
    [f.accountHolder, e.bank?.accountHolder ?? null],
    [f.effectiveDate, showDate(e.effectiveDate)],
    [f.terminationDate, showDate(e.termination?.requestedDate ?? null)],
    [f.terminationReason, e.termination?.reason ?? null],
    [f.summary, e.summary],
  ];
  return rows.flatMap(([label, value]) => (value ? [{ label, value }] : []));
}
