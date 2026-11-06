import { sql } from "drizzle-orm";
import { env } from "@/lib/env";
import * as app from "./schema/app";
import * as legacy from "./schema/legacy";
import { seedLegacy, type SeedSummary } from "./seed";
import { seedDemoCases, type DemoSummary } from "./seed-demo";
import { loadSeededCache, reloadSeededCache } from "./seed-cache";
import { withTransaction } from "./tx";

/** Typed error so callers (script, cron route) can tell a config problem from a DB failure. */
export class ResetConfigError extends Error {
  readonly code = "RESET_NOT_CONFIGURED";

  constructor(variable: "LEGACY_USER" | "LEGACY_PASSWORD") {
    super(`${variable} is not set. The legacy operator account needs it.`);
    this.name = "ResetConfigError";
  }
}

// Everything is wiped except `app.llm_cache`: its seeded rows are replaced from
// `seed/llm-cache.json` (see `reloadSeededCache`) and live-call rows are kept.
// All FK-linked tables are listed together, so no CASCADE is needed.
const TABLES_TO_WIPE = [
  app.auditLog,
  app.caseEvents,
  app.screenshots,
  app.replies,
  app.reviews,
  app.llmCalls,
  app.rateLimits,
  app.cases,
  legacy.changeLog,
  legacy.sepaMandates,
  legacy.policies,
  legacy.customers,
  legacy.legacyUsers,
];

export interface ResetSummary extends SeedSummary, DemoSummary {
  seededCacheEntries: number;
}

/**
 * Truncates the demo data and reseeds it in ONE transaction: readers never see a
 * half-empty database, and any failure leaves the previous data untouched.
 */
export async function resetDatabase(
  now: Date = new Date(),
): Promise<ResetSummary> {
  if (!env.LEGACY_USER) throw new ResetConfigError("LEGACY_USER");
  if (!env.LEGACY_PASSWORD) throw new ResetConfigError("LEGACY_PASSWORD");
  const operator = { username: env.LEGACY_USER, password: env.LEGACY_PASSWORD };

  // Validated before the transaction opens, so a broken cache file fails fast.
  const cacheEntries = loadSeededCache();

  return withTransaction(async (tx) => {
    // Tables render as "schema"."name" inside the sql template.
    const list = sql.join(
      TABLES_TO_WIPE.map((table) => sql`${table}`),
      sql`, `,
    );
    await tx.execute(sql`TRUNCATE ${list} RESTART IDENTITY`);
    const summary = await seedLegacy(tx, now, operator);
    const seededCacheEntries = await reloadSeededCache(tx, cacheEntries);
    const demo = await seedDemoCases(tx, now);
    return { ...summary, ...demo, seededCacheEntries };
  });
}
