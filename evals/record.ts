import { computeCacheKey } from "@/agent/llm/cache-key";
import type { ExtractResult } from "@/agent/llm/extract";
import { estimateCostUsd } from "@/agent/llm/pricing";
import type { SeedCacheEntry } from "@/agent/llm/seed-file";
import type { EvalCase } from "./schema";

interface RecordStats {
  calls: number;
  skipped: number;
  tokensIn: number;
  tokensOut: number;
  estCostUsd: number;
  failures: { id: string; message: string }[];
}

export interface RecordResult {
  /** Entries for exactly the given cases, sorted by key (stable diffs). */
  entries: SeedCacheEntry[];
  stats: RecordStats;
}

/**
 * Runs the live extraction for every case and returns cache entries. Entries that already exist
 * are reused unless `force` is set. Keys of cases that no longer exist (e.g. after a prompt
 * version bump) are dropped. One failing case is reported and does not stop the others.
 * Calls run one at a time: 24 short calls, and no burst against the provider's rate limit.
 */
export async function recordExtractions(options: {
  cases: EvalCase[];
  existing: SeedCacheEntry[];
  extract: (input: { subject: string; body: string }) => Promise<ExtractResult>;
  force?: boolean;
  onProgress?: (line: string) => void;
}): Promise<RecordResult> {
  const { cases, existing, extract, force = false, onProgress } = options;
  const known = new Map(existing.map((e) => [e.key, e]));
  const entries = new Map<string, SeedCacheEntry>();
  const stats: RecordStats = {
    calls: 0,
    skipped: 0,
    tokensIn: 0,
    tokensOut: 0,
    estCostUsd: 0,
    failures: [],
  };

  for (const c of cases) {
    const key = computeCacheKey(c.email.subject, c.email.body);
    const cached = known.get(key);
    if (cached && !force) {
      entries.set(key, cached);
      stats.skipped += 1;
      onProgress?.(`${c.id}: cached`);
      continue;
    }
    try {
      const live = await extract({
        subject: c.email.subject,
        body: c.email.body,
      });
      entries.set(key, { key, response: live.extraction, model: live.model });
      stats.calls += 1;
      stats.tokensIn += live.usage.tokensIn;
      stats.tokensOut += live.usage.tokensOut;
      stats.estCostUsd += estimateCostUsd(
        live.model,
        live.usage.tokensIn,
        live.usage.tokensOut,
      );
      onProgress?.(
        `${c.id}: live (${live.usage.tokensIn} in / ${live.usage.tokensOut} out)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stats.failures.push({ id: c.id, message });
      onProgress?.(`${c.id}: FAILED ${message}`);
      // Keep an older entry for this case rather than losing it on a transient failure.
      if (cached) entries.set(key, cached);
    }
  }

  return {
    entries: [...entries.values()].sort((a, b) => a.key.localeCompare(b.key)),
    stats,
  };
}
