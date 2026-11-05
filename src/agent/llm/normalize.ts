import type {
  ExtractedAddress,
  ExtractedBank,
  ExtractedIdentity,
  Intent,
  LegacySnapshot,
  RuleInput,
} from "@/agent/rules/types";
import { parseFlexibleDate } from "@/lib/dates";
import { normalizeIban } from "@/lib/iban";
import { normalizePlz, normalizePolicyNo, textOrNull } from "@/lib/normalize";
import type { Extraction } from "./schema";

/** The validated LLM output after normalization. Stored on the case; rules see it via `toRuleInput`. */
export interface NormalizedExtraction {
  /** Looked up in the legacy system by the identify step. */
  policyNo: string | null;
  language: "de" | "en" | "other";
  intents: Intent[];
  primaryIntent: Intent;
  confidence: number;
  identity: ExtractedIdentity;
  address: ExtractedAddress | null;
  bank: ExtractedBank | null;
  /** `YYYY-MM-DD`, for address and bank changes. */
  effectiveDate: string | null;
  termination: { requestedDate: string | null; reason: string | null } | null;
  summary: string | null;
}

/** Unparseable dates become `null`, i.e. "not stated": a missing date is never a mismatch. */
function dateOrNull(raw: string | null, now: Date): string | null {
  const text = textOrNull(raw);
  return text === null ? null : parseFlexibleDate(text, now);
}

/** The primary intent is always part of `intents`, listed first, without duplicates. */
function orderedIntents(primary: Intent, all: Intent[]): Intent[] {
  return [primary, ...new Set(all.filter((i) => i !== primary))];
}

/** Pure. Turns a schema-valid extraction into normalized values. `now` resolves two-digit years. */
export function normalizeExtraction(
  raw: Extraction,
  now: Date,
): NormalizedExtraction {
  const policyNo = textOrNull(raw.policy_no);
  const base = {
    policyNo: policyNo === null ? null : normalizePolicyNo(policyNo),
    language: raw.language,
    intents: orderedIntents(raw.primary_intent, raw.intents),
    primaryIntent: raw.primary_intent,
    confidence: raw.confidence,
    identity: {
      senderName: textOrNull(raw.sender_name),
      dateOfBirth: dateOrNull(raw.date_of_birth, now),
    },
    address: null,
    bank: null,
    effectiveDate: null,
    termination: null,
    summary: null,
  } satisfies NormalizedExtraction;

  switch (raw.primary_intent) {
    case "address_change": {
      const plz = textOrNull(raw.plz);
      return {
        ...base,
        address: {
          street: textOrNull(raw.strasse),
          houseNo: textOrNull(raw.hausnr),
          // Digits only; a 4-digit result stays as is so the PLZ rule can block it.
          plz: plz === null ? null : textOrNull(normalizePlz(plz)),
          city: textOrNull(raw.ort),
          country: textOrNull(raw.land),
        },
        effectiveDate: dateOrNull(raw.effective_date, now),
      };
    }
    case "bank_change": {
      const iban = textOrNull(raw.iban);
      return {
        ...base,
        bank: {
          iban: iban === null ? null : normalizeIban(iban),
          accountHolder: textOrNull(raw.account_holder),
        },
        effectiveDate: dateOrNull(raw.effective_date, now),
      };
    }
    case "termination":
      return {
        ...base,
        termination: {
          requestedDate: dateOrNull(raw.requested_termination_date, now),
          reason: textOrNull(raw.reason),
        },
      };
    case "other":
      return { ...base, summary: textOrNull(raw.summary) };
  }
}

/** Joins the normalized extraction with the identify result into the rule engine input. */
export function toRuleInput(
  extraction: NormalizedExtraction,
  context: { senderEmail: string; snapshot: LegacySnapshot | null; now: Date },
): RuleInput {
  return {
    intents: extraction.intents,
    primaryIntent: extraction.primaryIntent,
    confidence: extraction.confidence,
    identity: extraction.identity,
    address: extraction.address,
    bank: extraction.bank,
    senderEmail: context.senderEmail,
    snapshot: context.snapshot,
    now: context.now,
  };
}
