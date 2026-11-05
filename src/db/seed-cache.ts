import { eq, sql } from "drizzle-orm";
import {
  seedCacheFileSchema,
  type SeedCacheEntry,
} from "@/agent/llm/seed-file";
import seedFile from "../../seed/llm-cache.json";
import { llmCache } from "./schema/app";
import type { Tx } from "./tx";

/** The committed replay cache is malformed. Reset fails rather than silently losing the offline demo. */
export class SeedCacheError extends Error {
  readonly code = "SEED_CACHE_INVALID";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "SeedCacheError";
  }
}

/**
 * Validates the committed `seed/llm-cache.json`. It is imported as a module (not read from disk)
 * so the bundler ships it with the cron route on Vercel without any file-tracing config.
 */
export function loadSeededCache(raw: unknown = seedFile): SeedCacheEntry[] {
  const parsed = seedCacheFileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new SeedCacheError("seed/llm-cache.json is not a valid cache file", {
      cause: parsed.error,
    });
  }
  const keys = new Set(parsed.data.map((e) => e.key));
  if (keys.size !== parsed.data.length) {
    throw new SeedCacheError("seed/llm-cache.json contains duplicate keys");
  }
  return parsed.data;
}

/**
 * Makes `llm_cache` hold exactly the given seeded rows plus whatever live calls added.
 * Old seeded rows go (they may be stale after a prompt version bump); live rows (`seeded = false`)
 * stay, so a public demo does not lose its cache every night. A live row with the same key
 * becomes seeded. Returns the number of seeded rows.
 */
export async function reloadSeededCache(
  tx: Tx,
  entries: SeedCacheEntry[],
): Promise<number> {
  await tx.delete(llmCache).where(eq(llmCache.seeded, true));
  if (entries.length === 0) return 0;

  await tx
    .insert(llmCache)
    .values(entries.map((e) => ({ ...e, seeded: true })))
    .onConflictDoUpdate({
      target: llmCache.key,
      set: {
        response: sql`excluded.response`,
        model: sql`excluded.model`,
        seeded: sql`excluded.seeded`,
      },
    });
  return entries.length;
}
