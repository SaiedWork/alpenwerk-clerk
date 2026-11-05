// Pure IBAN helpers (ISO 13616). No dependencies, no I/O.

/** Strips all whitespace and uppercases, e.g. `de89 3704 ...` -> `DE893704...`. */
export function normalizeIban(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

/** Mod-97 remainder of a digit string, processed in chunks so no BigInt is needed. */
function mod97(digits: string): number {
  let remainder = 0;
  for (const char of digits) {
    remainder = (remainder * 10 + Number(char)) % 97;
  }
  return remainder;
}

/** ISO 13616 check: well-formed structure and mod-97 checksum equal to 1. Expects any input; normalizes first. */
export function isValidIban(raw: string): boolean {
  const iban = normalizeIban(raw);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  // Move the first four characters to the end, then map letters to numbers (A=10 ... Z=35).
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = [...rearranged]
    .map((char) =>
      /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char,
    )
    .join("");
  return mod97(digits) === 1;
}

/** German IBAN: `DE` plus 22 characters in total. Does not check the checksum. */
export function isGermanIban(raw: string): boolean {
  return /^DE\d{20}$/.test(normalizeIban(raw));
}

/** Masks an IBAN for customer-facing text: `DE89 **** **** **** **** 00`. */
export function maskIban(raw: string): string {
  const iban = normalizeIban(raw);
  if (iban.length < 8) return "****";
  const middle = Math.ceil((iban.length - 6) / 4);
  const groups = Array.from({ length: middle }, () => "****");
  return [iban.slice(0, 4), ...groups, iban.slice(-2)].join(" ");
}
