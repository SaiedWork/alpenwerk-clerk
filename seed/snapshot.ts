import type { LegacySnapshot, PolicyStatus } from "@/agent/rules/types";
import type { CustomerFixture } from "./customers";

/**
 * Builds what the browser would have read from the legacy
 * UI straight from a seed fixture. Used by the evals (no browser) and by the stub snapshot reader
 * that stands in for the browser driver until the executor exists.
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
