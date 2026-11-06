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

/** Names of the address fields that differ; empty if writing `target` would change nothing. */
export function addressDifferences(
  current: CurrentAddress,
  target: AddressTarget,
): string[] {
  const differing: string[] = [];
  if (!same(current.street, target.street)) differing.push("street");
  if (!same(current.houseNo, target.houseNo)) differing.push("houseNo");
  if (normalizePlz(current.plz) !== normalizePlz(target.plz)) {
    differing.push("plz");
  }
  if (!same(current.city, target.city)) differing.push("city");
  if (target.country !== null && !same(current.country, target.country)) {
    differing.push("country");
  }
  return differing;
}

/** Names of the bank fields that differ. A `null` holder in the target is not compared. */
export function bankDifferences(
  current: CurrentBank,
  target: BankTarget,
): string[] {
  const differing: string[] = [];
  if (normalizeIban(current.iban) !== normalizeIban(target.iban)) {
    differing.push("iban");
  }
  if (target.holder !== null && !same(current.holder, target.holder)) {
    differing.push("holder");
  }
  return differing;
}

/** True if writing `target` would change nothing. Text compares ignore case and extra spaces. */
export function addressMatches(
  current: CurrentAddress,
  target: AddressTarget,
): boolean {
  return addressDifferences(current, target).length === 0;
}

export function bankMatches(current: CurrentBank, target: BankTarget): boolean {
  return bankDifferences(current, target).length === 0;
}
