import { describe, expect, it } from "vitest";
import {
  claimOnce,
  hitRateLimit,
  releaseClaim,
  type RateLimitStore,
} from "@/lib/rate-limit";

class MemoryStore implements RateLimitStore {
  counts = new Map<string, number>();
  private id = (key: string, at: Date) => `${key}@${at.toISOString()}`;
  async increment(key: string, at: Date) {
    const k = this.id(key, at);
    const n = (this.counts.get(k) ?? 0) + 1;
    this.counts.set(k, n);
    return n;
  }
  async release(key: string, at: Date) {
    this.counts.delete(this.id(key, at));
  }
}

const hit = (store: RateLimitStore, key: string, now: Date, limit = 3) =>
  hitRateLimit({ store, key, limit, windowSeconds: 3600, now });

describe("hitRateLimit", () => {
  const t0 = new Date("2026-11-06T10:15:00Z");

  it("allows up to the limit, then blocks", async () => {
    const store = new MemoryStore();
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await hit(store, "ip1", t0));
    expect(results.map((r) => r.allowed)).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
    expect(results.map((r) => r.remaining)).toEqual([2, 1, 0, 0, 0]);
  });

  it("aligns windows to the clock and reports the reset time", async () => {
    const r = await hit(new MemoryStore(), "ip1", t0);
    expect(r.resetAt).toEqual(new Date("2026-11-06T11:00:00Z"));
  });

  it("starts a fresh counter in the next window", async () => {
    const store = new MemoryStore();
    for (let i = 0; i < 4; i++) await hit(store, "ip1", t0);
    const next = await hit(store, "ip1", new Date("2026-11-06T11:00:00Z"));
    expect(next).toMatchObject({ allowed: true, count: 1 });
  });

  it("keeps keys independent", async () => {
    const store = new MemoryStore();
    for (let i = 0; i < 4; i++) await hit(store, "ip1", t0);
    expect((await hit(store, "ip2", t0)).allowed).toBe(true);
  });
});

describe("claimOnce", () => {
  it("is true only for the first claim, regardless of time", async () => {
    const store = new MemoryStore();
    expect(await claimOnce(store, "k")).toBe(true);
    expect(await claimOnce(store, "k")).toBe(false);
    expect(await claimOnce(store, "other")).toBe(true);
  });

  it("can be released and claimed again", async () => {
    const store = new MemoryStore();
    await claimOnce(store, "k");
    await releaseClaim(store, "k");
    expect(await claimOnce(store, "k")).toBe(true);
  });
});
