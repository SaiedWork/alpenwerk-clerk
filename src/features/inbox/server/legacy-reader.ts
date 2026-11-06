import { launchBrowser } from "@/agent/executor/launch-browser";
import { PlaywrightLegacyDriver } from "@/agent/executor/playwright-driver";
import { createDbScreenshotSink } from "@/agent/executor/screenshot-sink";
import type { LegacyWriter } from "@/agent/executor/driver";
import type { LegacySnapshotReader } from "@/agent/executor/snapshot-reader";
import type { Db } from "@/db/client";
import { env } from "@/lib/env";
import { createSeedSnapshotReader } from "./seed-snapshot-reader";

export interface CaseLegacyReader {
  reader: LegacySnapshotReader;
  /** `undefined` in seed mode: there is no browser to write with. */
  writer?: LegacyWriter;
  /** Releases the browser, if one was started. Always call it when the run is over. */
  close(): Promise<void>;
}

/**
 * Chooses how the pipeline reaches the legacy system: the browser driver for reads and writes
 * (`LEGACY_READER=browser`) or the seed-fixture stub (default; offline, read-only, no browser).
 */
export function createCaseLegacyReader(
  db: Db,
  caseId: string,
): CaseLegacyReader {
  if (env.LEGACY_READER === "seed") {
    return { reader: createSeedSnapshotReader(), close: async () => {} };
  }
  const driver = new PlaywrightLegacyDriver({
    baseUrl: env.LEGACY_BASE_URL,
    user: env.LEGACY_USER,
    password: env.LEGACY_PASSWORD,
    caseId,
    sink: createDbScreenshotSink(db),
    launch: launchBrowser,
  });
  return { reader: driver, writer: driver, close: () => driver.close() };
}
