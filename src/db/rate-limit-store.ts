import { and, eq, sql } from "drizzle-orm";
import type { RateLimitStore } from "@/lib/rate-limit";
import type { Db } from "./client";
import { rateLimits } from "./schema/app";

/** One statement per call, so concurrent requests cannot lose an increment. */
export function createDbRateLimitStore(db: Db): RateLimitStore {
  return {
    async increment(key, windowStart) {
      const [row] = await db
        .insert(rateLimits)
        .values({ key, windowStart, count: 1 })
        .onConflictDoUpdate({
          target: [rateLimits.key, rateLimits.windowStart],
          set: { count: sql`${rateLimits.count} + 1` },
        })
        .returning({ count: rateLimits.count });
      return row.count;
    },
    async release(key, windowStart) {
      await db
        .delete(rateLimits)
        .where(
          and(eq(rateLimits.key, key), eq(rateLimits.windowStart, windowStart)),
        );
    },
  };
}
