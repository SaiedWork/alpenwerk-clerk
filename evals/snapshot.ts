import type { LegacySnapshot, PolicyStatus } from "@/agent/rules/types";
import { buildCustomerFixtures, type CustomerFixture } from "../seed/customers";

/** Fixed clock for evals; the seed fixtures' relative dates are computed from it. */
export const EVAL_NOW = new Date("2026-11-05T10:00:00Z");

/**
 * Test double for the identify step: builds what the browser would have read from the legacy
 * UI straight from the seed fixture. Evals never open a browser.
 */
export function snapshotFromFixture(fixture: CustomerFixture): LegacySnapshot {
  const { customer, policy, mandate, changes = [] } = fixture;
  const addressChanges = changes
    .filter((c) => c.field === "adresse" && c.changedAt)
    .map((c) => c.changedAt as Date);
  const surrender = policy.rueckkaufswertIndikativ;

  return {
    policyNo: policy.policyNo,
    status: policy.status as PolicyStatus,
    firstName: customer.vorname,
    lastName: customer.nachname,
    dateOfBirth: customer.geburtsdatum,
    email: customer.email,
    activeMandate:
      mandate?.status === "aktiv"
        ? { iban: mandate.iban, holder: mandate.kontoinhaber }
        : null,
    lastAddressChangeAt:
      addressChanges.length > 0
        ? new Date(Math.max(...addressChanges.map((d) => d.getTime())))
        : null,
    irrevocableBeneficiary: policy.unwiderruflicheBezugsberechtigung ?? false,
    surrenderValueIndicative:
      surrender === null || surrender === undefined ? null : Number(surrender),
  };
}

/** `null` for `policyFixture: null` (policy unknown) and for an unknown key. */
export function findFixture(
  key: string | null,
  now: Date = EVAL_NOW,
): CustomerFixture | null {
  if (key === null) return null;
  return buildCustomerFixtures(now).find((f) => f.key === key) ?? null;
}
