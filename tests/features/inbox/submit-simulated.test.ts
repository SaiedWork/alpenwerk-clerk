import { describe, expect, it, vi } from "vitest";
import {
  submitSimulatedEmail,
  type SubmitDeps,
} from "@/features/inbox/server/submit-simulated";
import type { RateLimitStore } from "@/lib/rate-limit";

function memoryStore(): RateLimitStore {
  const counts = new Map<string, number>();
  const id = (key: string, at: Date) => `${key}|${at.getTime()}`;
  return {
    async increment(key, at) {
      const next = (counts.get(id(key, at)) ?? 0) + 1;
      counts.set(id(key, at), next);
      return next;
    },
    async release(key, at) {
      counts.delete(id(key, at));
    },
  };
}

const EMAIL = { from: "a@example.org", subject: "Hallo", body: "Text" };
const NOW = new Date("2026-11-06T12:00:00Z");

function deps(overrides: Partial<SubmitDeps> = {}) {
  const ingest = vi.fn(async () => ({ caseId: "case-1" }));
  const schedule = vi.fn();
  const all: SubmitDeps = {
    store: memoryStore(),
    clientKey: "visitor",
    submitPerDay: 3,
    livePerHour: 1,
    liveEnabled: true,
    isRecorded: async () => true,
    ingest,
    schedule,
    now: () => NOW,
    ...overrides,
  };
  return { all, ingest, schedule };
}

describe("submitSimulatedEmail", () => {
  it("creates the case and schedules the run", async () => {
    const { all, ingest, schedule } = deps();
    expect(await submitSimulatedEmail(EMAIL, all)).toEqual({
      ok: true,
      caseId: "case-1",
    });
    expect(ingest).toHaveBeenCalledOnce();
    expect(schedule).toHaveBeenCalledWith("case-1");
  });

  it("rejects invalid input without touching the limiter", async () => {
    const { all, ingest } = deps();
    for (const bad of [
      {},
      { ...EMAIL, from: "nope" },
      { ...EMAIL, body: "   " },
      { ...EMAIL, body: "x".repeat(4001) },
      { ...EMAIL, extra: 1 },
    ]) {
      expect(await submitSimulatedEmail(bad, all)).toEqual({
        ok: false,
        error: "INVALID_INPUT",
      });
    }
    expect(ingest).not.toHaveBeenCalled();
  });

  it("enforces the daily limit across all submissions of a visitor", async () => {
    const { all, ingest } = deps();
    for (let i = 0; i < 3; i++) await submitSimulatedEmail(EMAIL, all);
    const result = await submitSimulatedEmail(EMAIL, all);
    expect(result).toMatchObject({ ok: false, error: "RATE_LIMIT_DAILY" });
    expect(ingest).toHaveBeenCalledTimes(3);
  });

  it("limits visitors independently", async () => {
    const store = memoryStore();
    const a = deps({ store, clientKey: "a", submitPerDay: 1 }).all;
    const b = deps({ store, clientKey: "b", submitPerDay: 1 }).all;
    await submitSimulatedEmail(EMAIL, a);
    expect((await submitSimulatedEmail(EMAIL, a)).ok).toBe(false);
    expect((await submitSimulatedEmail(EMAIL, b)).ok).toBe(true);
  });

  it("counts only unrecorded texts against the live limit", async () => {
    const { all, ingest } = deps({ isRecorded: async () => false });
    expect((await submitSimulatedEmail(EMAIL, all)).ok).toBe(true);
    expect(await submitSimulatedEmail(EMAIL, all)).toMatchObject({
      ok: false,
      error: "RATE_LIMIT_LIVE",
    });
    expect(ingest).toHaveBeenCalledOnce();

    const recorded = deps({ livePerHour: 1 }).all; // isRecorded: true
    for (let i = 0; i < 3; i++) {
      expect((await submitSimulatedEmail(EMAIL, recorded)).ok).toBe(true);
    }
  });

  it("refuses an unrecorded text when live calls are off", async () => {
    const { all, ingest } = deps({
      isRecorded: async () => false,
      liveEnabled: false,
    });
    expect(await submitSimulatedEmail(EMAIL, all)).toEqual({
      ok: false,
      error: "LIVE_DISABLED",
    });
    expect(ingest).not.toHaveBeenCalled();
  });

  it("reports when the window resets", async () => {
    const { all } = deps({ submitPerDay: 1 });
    await submitSimulatedEmail(EMAIL, all);
    const result = await submitSimulatedEmail(EMAIL, all);
    expect(result.ok === false && result.resetAt).toEqual(
      new Date("2026-11-07T00:00:00Z"),
    );
  });
});
