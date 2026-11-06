import type { LegacySnapshotReader } from "@/agent/executor/snapshot-reader";
import { buildCustomerFixtures } from "../../../../seed/customers";
import { snapshotFromFixture } from "../../../../seed/snapshot";

/**
 * Stub reader: answers from the seed fixtures, which is what the legacy database holds after a
 * reset. It stands in for the browser driver until the executor exists (Day 3).
 */
export function createSeedSnapshotReader(
  now: () => Date = () => new Date(),
): LegacySnapshotReader {
  return {
    async readPolicy(policyNo) {
      const fixture = buildCustomerFixtures(now()).find(
        (f) => f.policy.policyNo === policyNo,
      );
      return fixture ? snapshotFromFixture(fixture) : null;
    },
  };
}
