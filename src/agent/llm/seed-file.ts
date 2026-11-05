import { z } from "zod";

/**
 * Format of `seed/llm-cache.json`: the committed replay cache. Written by the seed-cache script,
 * read by the eval runner and by the `llm_cache` reload on reset. `response` is re-validated
 * against the extraction schema when it is read from the cache, not here.
 */
export const seedCacheFileSchema = z.array(
  z.strictObject({
    key: z.string().min(1),
    response: z.unknown(),
    model: z.string().min(1),
  }),
);

export type SeedCacheEntry = z.infer<typeof seedCacheFileSchema>[number];

/** Parses the JSON text of a seed cache file; throws a `ZodError` naming the bad entry. */
export function parseSeedCacheFile(json: string): SeedCacheEntry[] {
  return seedCacheFileSchema.parse(JSON.parse(json));
}
