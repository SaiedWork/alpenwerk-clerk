import { normalizeIban } from "@/lib/iban";
import { normalizePlz, normalizeText } from "@/lib/normalize";

/**
 * Address to write. All parts except `country` are required: the rules block an incomplete
 * address before execution. `null` country keeps the one the legacy system already has.
 */
export interface AddressTarget {
  street: string;
  houseNo: string;
  plz: string;
  city: string;
  country: string | null;
}

/** Bank data to write. `null` holder keeps the holder already on the mandate. */
export interface BankTarget {
  iban: string;
  holder: string | null;
}

/** The current values as the legacy forms show them. */
export interface CurrentAddress {
  street: string;
  houseNo: string;
  plz: string;
  city: string;
  country: string;
}

export interface CurrentBank {
  iban: string;
  holder: string;
}

export type WriteOutcome =
  "changed" | "unchanged" | "no_mandate" | "policy_not_found";

const same = (a: string, b: string) =>
  normalizeText(a).toLowerCase() === normalizeText(b).toLowerCase();

/** True if writing `target` would change nothing. Text compares ignore case and extra spaces. */
export function addressMatches(
  current: CurrentAddress,
  target: AddressTarget,
): boolean {
  return (
    same(current.street, target.street) &&
    same(current.houseNo, target.houseNo) &&
    normalizePlz(current.plz) === normalizePlz(target.plz) &&
    same(current.city, target.city) &&
    (target.country === null || same(current.country, target.country))
  );
}

export function bankMatches(current: CurrentBank, target: BankTarget): boolean {
  return (
    normalizeIban(current.iban) === normalizeIban(target.iban) &&
    (target.holder === null || same(current.holder, target.holder))
  );
}
