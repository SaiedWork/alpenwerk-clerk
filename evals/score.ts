import type { NormalizedExtraction } from "@/agent/llm/normalize";
import type { Evaluation } from "@/agent/rules/engine";
import { namesMatch, normalizeText } from "@/lib/normalize";
import type { EvalCase, ExpectedFields } from "./schema";

/** First stage at which a case went wrong; later stages are usually consequences of it. */
type Divergence =
  "no_extraction" | "intent" | "fields" | "decision" | "reasonCodes";

export interface CaseResult {
  id: string;
  /** Set when no extraction could be produced (e.g. replay cache miss). */
  error: string | null;
  actual: {
    intent: string | null;
    decision: string | null;
    reasonCodes: string[];
  };
  intentOk: boolean;
  intentsOk: boolean;
  fieldsChecked: number;
  fieldsCorrect: number;
  /** `key: expected != actual`, for the report. */
  fieldMisses: string[];
  decisionOk: boolean;
  reasonCodesOk: boolean;
  firstDivergence: Divergence | null;
}

export interface EvalSummary {
  total: number;
  errors: number;
  /** Fractions in 0..1. Cases without an extraction count as wrong. */
  intentAccuracy: number;
  intentsAccuracy: number;
  fieldAccuracy: number;
  decisionAccuracy: number;
  reasonCodeAccuracy: number;
  allCorrect: number;
}

type FieldKey = keyof ExpectedFields;
type Actual = string | null;

function actualField(x: NormalizedExtraction, key: FieldKey): Actual {
  switch (key) {
    case "policyNo":
      return x.policyNo;
    case "senderName":
      return x.identity.senderName;
    case "dateOfBirth":
      return x.identity.dateOfBirth;
    case "street":
      return x.address?.street ?? null;
    case "houseNo":
      return x.address?.houseNo ?? null;
    case "plz":
      return x.address?.plz ?? null;
    case "city":
      return x.address?.city ?? null;
    case "country":
      return x.address?.country ?? null;
    case "iban":
      return x.bank?.iban ?? null;
    case "accountHolder":
      return x.bank?.accountHolder ?? null;
  }
}

/** Names compare order-independently; other text case-insensitively; identifiers exactly. */
function fieldMatches(
  key: FieldKey,
  expected: Actual,
  actual: Actual,
): boolean {
  if (expected === null || actual === null) return expected === actual;
  if (key === "senderName" || key === "accountHolder")
    return namesMatch(expected, actual);
  if (key === "street" || key === "city" || key === "country")
    return (
      normalizeText(expected).toLowerCase() ===
      normalizeText(actual).toLowerCase()
    );
  return expected === actual;
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  const left = new Set(a);
  const right = new Set(b);
  return left.size === right.size && [...left].every((v) => right.has(v));
}

function expectedEntries(c: EvalCase): [FieldKey, Actual][] {
  return Object.entries(c.expectedFields) as [FieldKey, Actual][];
}

/** Pure. Compares what the pipeline produced with the labels of one case. */
export function scoreCase(
  c: EvalCase,
  extraction: NormalizedExtraction,
  evaluation: Evaluation,
): CaseResult {
  const intentOk = extraction.primaryIntent === c.expected.intent;
  const intentsOk = sameSet(
    extraction.intents,
    c.expected.intents ?? [c.expected.intent],
  );

  const entries = expectedEntries(c);
  const fieldMisses = entries.flatMap(([key, expected]) => {
    const actual = actualField(extraction, key);
    return fieldMatches(key, expected, actual)
      ? []
      : [`${key}: ${expected} != ${actual}`];
  });

  const decisionOk = evaluation.decision === c.expected.decision;
  const reasonCodesOk = sameSet(evaluation.reasonCodes, c.expected.reasonCodes);

  const firstDivergence: Divergence | null = !intentOk
    ? "intent"
    : fieldMisses.length > 0
      ? "fields"
      : !decisionOk
        ? "decision"
        : !reasonCodesOk
          ? "reasonCodes"
          : null;

  return {
    id: c.id,
    error: null,
    actual: {
      intent: extraction.primaryIntent,
      decision: evaluation.decision,
      reasonCodes: evaluation.reasonCodes,
    },
    intentOk,
    intentsOk,
    fieldsChecked: entries.length,
    fieldsCorrect: entries.length - fieldMisses.length,
    fieldMisses,
    decisionOk,
    reasonCodesOk,
    firstDivergence,
  };
}

/** A case for which no extraction exists: everything counts as wrong. */
export function errorResult(c: EvalCase, error: string): CaseResult {
  return {
    id: c.id,
    error,
    actual: { intent: null, decision: null, reasonCodes: [] },
    intentOk: false,
    intentsOk: false,
    fieldsChecked: expectedEntries(c).length,
    fieldsCorrect: 0,
    fieldMisses: [],
    decisionOk: false,
    reasonCodesOk: false,
    firstDivergence: "no_extraction",
  };
}

function ratio(part: number, whole: number): number {
  return whole === 0 ? 1 : part / whole;
}

export function summarize(results: CaseResult[]): EvalSummary {
  const total = results.length;
  const count = (f: (r: CaseResult) => boolean) => results.filter(f).length;
  return {
    total,
    errors: count((r) => r.error !== null),
    intentAccuracy: ratio(
      count((r) => r.intentOk),
      total,
    ),
    intentsAccuracy: ratio(
      count((r) => r.intentsOk),
      total,
    ),
    fieldAccuracy: ratio(
      results.reduce((n, r) => n + r.fieldsCorrect, 0),
      results.reduce((n, r) => n + r.fieldsChecked, 0),
    ),
    decisionAccuracy: ratio(
      count((r) => r.decisionOk),
      total,
    ),
    reasonCodeAccuracy: ratio(
      count((r) => r.reasonCodesOk),
      total,
    ),
    allCorrect: count((r) => r.firstDivergence === null),
  };
}
