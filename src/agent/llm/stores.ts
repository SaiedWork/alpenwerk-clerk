import { and, count, eq, gte } from "drizzle-orm";
import type { Db } from "@/db/client";
import { llmCache, llmCalls } from "@/db/schema/app";

export interface CachedResponse {
  response: unknown;
  model: string;
}

export interface CacheStore {
  get(key: string): Promise<CachedResponse | null>;
  /** Insert or replace, so a corrupt row can be healed by a fresh live answer. */
  put(row: {
    key: string;
    response: unknown;
    model: string;
    seeded: boolean;
  }): Promise<void>;
}

export interface CallRecord {
  caseId: string | null;
  model: string;
  tokensIn: number;
  tokensOut: number;
  cached: boolean;
  estCostUsd: number;
}

export interface CallStore {
  insert(record: CallRecord): Promise<void>;
  /** Number of live (non-cached) calls recorded at or after `since`. */
  countLiveSince(since: Date): Promise<number>;
}

/** Drizzle-backed stores. Kept thin: all decisions live in `resolve.ts`, which is unit-tested. */
export function createDbStores(db: Db): {
  cache: CacheStore;
  calls: CallStore;
} {
  const cache: CacheStore = {
    async get(key) {
      const [row] = await db
        .select({ response: llmCache.response, model: llmCache.model })
        .from(llmCache)
        .where(eq(llmCache.key, key))
        .limit(1);
      return row ?? null;
    },
    async put(row) {
      await db
        .insert(llmCache)
        .values(row)
        .onConflictDoUpdate({
          target: llmCache.key,
          set: { response: row.response, model: row.model, seeded: row.seeded },
        });
    },
  };

  const calls: CallStore = {
    async insert(record) {
      await db
        .insert(llmCalls)
        .values({ ...record, estCostUsd: record.estCostUsd.toFixed(6) });
    },
    async countLiveSince(since) {
      const [row] = await db
        .select({ n: count() })
        .from(llmCalls)
        .where(and(eq(llmCalls.cached, false), gte(llmCalls.at, since)));
      return row?.n ?? 0;
    },
  };

  return { cache, calls };
}
