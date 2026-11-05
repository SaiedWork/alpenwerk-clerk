// Pure normalization helpers for post-LLM values. Rules only ever see normalized values.

/** Trims and collapses runs of whitespace into single spaces. */
export function normalizeText(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** PLZ keeps digits only: `D-50667 ` -> `50667`. */
export function normalizePlz(raw: string): string {
  return raw.replace(/\D+/g, "");
}

const TITLES = new Set([
  "dr",
  "prof",
  "dipl",
  "ing",
  "med",
  "mag",
  "herr",
  "frau",
]);

/**
 * Name normalization: lowercase, German umlauts transliterated (ä->ae, ö->oe, ü->ue, ß->ss),
 * other diacritics stripped (NFKD), hyphens and punctuation treated as spaces.
 */
export function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/ł/g, "l")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Sorted, de-duplicated name tokens without titles such as "Dr.". */
export function nameTokens(raw: string): string[] {
  const tokens = normalizeName(raw)
    .split(" ")
    .filter((token) => token !== "" && !TITLES.has(token));
  return [...new Set(tokens)].sort();
}

/** Order-independent name comparison on token sets. Empty names never match. */
export function namesMatch(a: string, b: string): boolean {
  const left = nameTokens(a);
  const right = nameTokens(b);
  return (
    left.length > 0 &&
    left.length === right.length &&
    left.every((token, i) => token === right[i])
  );
}
