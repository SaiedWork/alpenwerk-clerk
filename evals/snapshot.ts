import { buildCustomerFixtures, type CustomerFixture } from "../seed/customers";
import { snapshotFromFixture } from "../seed/snapshot";

export { snapshotFromFixture };

/** Fixed clock for evals; the seed fixtures' relative dates are computed from it. */
export const EVAL_NOW = new Date("2026-11-05T10:00:00Z");

/** `null` for `policyFixture: null` (policy unknown) and for an unknown key. */
export function findFixture(
  key: string | null,
  now: Date = EVAL_NOW,
): CustomerFixture | null {
  if (key === null) return null;
  return buildCustomerFixtures(now).find((f) => f.key === key) ?? null;
}
