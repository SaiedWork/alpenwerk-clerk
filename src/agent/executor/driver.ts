import type { LegacySnapshotReader } from "./snapshot-reader";

/**
 * The agent's only way into the legacy system: a browser session that behaves like a human
 * operator. Pipeline steps depend on this interface (or on the read-only
 * `LegacySnapshotReader` part of it), never on Playwright.
 *
 * Reads exist so far. `updateAddress`, `updateBank` and the read-back for verification join
 * this interface with the execute step.
 */
export interface LegacyDriver extends LegacySnapshotReader {
  /** Releases the browser. Safe to call when nothing was opened, and more than once. */
  close(): Promise<void>;
}
