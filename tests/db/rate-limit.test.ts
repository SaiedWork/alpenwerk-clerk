import { randomUUID } from "node:crypto";
import { like } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";
import { submitSimulatedEmail } from "@/features/inbox/server/submit-simulated";
import { claimOnce, hitRateLimit, releaseClaim } from "@/lib/rate-limit";

// Needs a real database: run with `node --env-file=.env.local` (skipped without a connection).
// Every row uses a random key prefix and is deleted afterwards; no other data is touched.
describe.skipIf(!process.env.DATABASE_URL)(
  "rate limits against Postgres (database)",
  () => {
    const prefix = `test-${randomUUID()}`;
    const NOW = new Date("2026-11-06T12:34:56Z");
    const EMAIL = { from: "a@example.org", subject: "Hallo", body: "Text" };

    async function setup() {
      const { getDb } = await import("@/db/client");
      const { createDbRateLimitStore } = await import("@/db/rate-limit-store");
      const db = getDb();
      return { db, store: createDbRateLimitStore(db) };
    }

    afterAll(async () => {
      const { db } = await setup();
      const { rateLimits } = await import("@/db/schema/app");
      await db.delete(rateLimits).where(like(rateLimits.key, `${prefix}%`));
    });

    it("refuses the submit after the daily limit and reports the reset time", async () => {
      const { store } = await setup();
      const deps = {
        store,
        clientKey: `${prefix}-visitor`,
        submitPerDay: 3,
        livePerHour: 10,
        liveEnabled: true,
        isRecorded: async () => true,
        ingest: vi.fn(async () => ({ caseId: "case-1" })),
        schedule: vi.fn(),
        now: () => NOW,
      };
      for (let i = 0; i < 3; i += 1) {
        expect((await submitSimulatedEmail(EMAIL, deps)).ok).toBe(true);
      }
      expect(await submitSimulatedEmail(EMAIL, deps)).toEqual({
        ok: false,
        error: "RATE_LIMIT_DAILY",
        resetAt: new Date("2026-11-07T00:00:00Z"),
      });
      expect(deps.ingest).toHaveBeenCalledTimes(3);
      // another visitor is not affected
      expect(
        (
          await submitSimulatedEmail(EMAIL, {
            ...deps,
            clientKey: `${prefix}-b`,
          })
        ).ok,
      ).toBe(true);
    });

    it("starts a new counter in the next window", async () => {
      const { store } = await setup();
      const hit = (now: Date) =>
        hitRateLimit({
          store,
          key: `${prefix}-window`,
          limit: 1,
          windowSeconds: 3600,
          now,
        });
      await hit(NOW);
      expect((await hit(NOW)).allowed).toBe(false);
      expect(await hit(new Date("2026-11-06T13:00:00Z"))).toMatchObject({
        allowed: true,
        count: 1,
      });
    });

    it("does not lose increments under parallel requests", async () => {
      const { store } = await setup();
      const counts = await Promise.all(
        Array.from({ length: 20 }, () =>
          store.increment(`${prefix}-parallel`, NOW),
        ),
      );
      expect([...counts].sort((a, b) => a - b)).toEqual(
        Array.from({ length: 20 }, (_, i) => i + 1),
      );
    });

    it("claims once and can release the claim", async () => {
      const { store } = await setup();
      const key = `${prefix}-claim`;
      expect(await claimOnce(store, key)).toBe(true);
      expect(await claimOnce(store, key)).toBe(false);
      await releaseClaim(store, key);
      expect(await claimOnce(store, key)).toBe(true);
    });
  },
);
