import type { LegacySnapshot } from "@/agent/rules/types";

/**
 * What the identify step needs from the legacy system: a read-only look at one policy.
 * The browser driver (`LegacyDriver`, Day 3) implements this; until then a stub backed by seed
 * fixtures does. The agent only ever sees this interface, never legacy code or tables.
 */
export interface LegacySnapshotReader {
  /** `null` when the policy number does not exist in the legacy system. */
  readPolicy(policyNo: string): Promise<LegacySnapshot | null>;
}
