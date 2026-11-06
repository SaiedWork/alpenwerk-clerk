import { launchBrowser } from "@/agent/executor/launch-browser";
import { PlaywrightLegacyDriver } from "@/agent/executor/playwright-driver";
import { createDbScreenshotSink } from "@/agent/executor/screenshot-sink";
import type { LegacySnapshotReader } from "@/agent/executor/snapshot-reader";
import type { Db } from "@/db/client";
import { env } from "@/lib/env";
import { createSeedSnapshotReader } from "./seed-snapshot-reader";

export interface CaseLegacyReader {
  reader: LegacySnapshotReader;
  /** Releases the browser, if one was started. Always call it when the run is over. */
  close(): Promise<void>;
}

/**
 * Chooses how the identify step reads the legacy system: the browser driver
 * (`LEGACY_READER=browser`) or the seed-fixture stub (default; offline, no browser).
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
    step: "identify",
    sink: createDbScreenshotSink(db),
    launch: launchBrowser,
  });
  return { reader: driver, close: () => driver.close() };
}
