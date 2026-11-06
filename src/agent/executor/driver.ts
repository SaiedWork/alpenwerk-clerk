import type { LegacySnapshotReader } from "./snapshot-reader";
import type {
  AddressTarget,
  BankTarget,
  CurrentAddress,
  CurrentBank,
  WriteOutcome,
} from "./targets";

/**
 * The agent's only way into the legacy system: a browser session that behaves like a human
 * operator. Pipeline steps depend on this interface (or on the read-only
 * `LegacySnapshotReader` part of it), never on Playwright.
 *
 * `LegacyWriter` is the part the execute step needs. Writes skip the submit when the system already holds the target values (`unchanged`) and
 * throw a `LegacyDriverError` if the system rejects the form or confirms other values.
 */
export interface LegacyWriter {
  updateAddress(policyNo: string, target: AddressTarget): Promise<WriteOutcome>;
  updateBank(policyNo: string, target: BankTarget): Promise<WriteOutcome>;
}

export interface LegacyDriver extends LegacySnapshotReader, LegacyWriter {
  /** Current address as the edit form shows it; `null` if the policy does not exist. */
  readAddress(policyNo: string): Promise<CurrentAddress | null>;
  /** Current active mandate; `null` if the policy does not exist or has no active mandate. */
  readBank(policyNo: string): Promise<CurrentBank | null>;
  /** Releases the browser. Safe to call when nothing was opened, and more than once. */
  close(): Promise<void>;
}
