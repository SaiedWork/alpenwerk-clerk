import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseSeedCacheFile, type SeedCacheEntry } from "@/agent/llm/seed-file";
import type { CacheStore, CachedResponse, CallStore } from "@/agent/llm/stores";

export const SEED_CACHE_PATH = path.join(
  process.cwd(),
  "seed",
  "llm-cache.json",
);

/** `null` while the file does not exist yet (before the seed-cache script has run). */
export function readSeedCache(
  file: string = SEED_CACHE_PATH,
): SeedCacheEntry[] | null {
  if (!existsSync(file)) return null;
  return parseSeedCacheFile(readFileSync(file, "utf8"));
}

/** In-memory stores so evals run without a database; `resolveExtraction` is used unchanged. */
export function createMemoryStores(entries: SeedCacheEntry[]): {
  cache: CacheStore;
  calls: CallStore;
} {
  const rows = new Map<string, CachedResponse>(
    entries.map((e) => [e.key, { response: e.response, model: e.model }]),
  );
  return {
    cache: {
      async get(key) {
        return rows.get(key) ?? null;
      },
      async put(row) {
        rows.set(row.key, { response: row.response, model: row.model });
      },
    },
    calls: {
      async insert() {},
      async countLiveSince() {
        return 0;
      },
    },
  };
}
