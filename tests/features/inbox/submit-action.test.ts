import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RateLimitStore } from "@/lib/rate-limit";

const mocks = vi.hoisted(() => ({
  headers: new Headers(),
  env: {
    IP_HASH_SALT: "test-salt" as string | undefined,
    RATE_LIMIT_SUBMIT_PER_DAY: 1,
    RATE_LIMIT_LIVE_PER_HOUR: 10,
    LLM_PROVIDER: "replay",
  },
  increment: vi.fn<RateLimitStore["increment"]>(),
  ingest: vi.fn(async () => ({ caseId: "case-1" })),
}));

vi.mock("next/headers", () => ({ headers: async () => mocks.headers }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("next/navigation", () => ({
  // The real redirect() throws; the action must let it through.
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
}));
vi.mock("@/lib/env", () => ({ env: mocks.env }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/db/client", () => ({ getDb: () => ({}) }));
vi.mock("@/agent/llm/stores", () => ({
  // Every text counts as recorded, so only the daily limit is in play.
  createDbStores: () => ({ cache: { get: async () => ({}) } }),
}));
vi.mock("@/db/rate-limit-store", () => ({
  createDbRateLimitStore: () => ({
    increment: mocks.increment,
    release: async () => {},
  }),
}));
vi.mock("@/features/inbox/server/ingest", () => ({
  ingestEmail: mocks.ingest,
}));
vi.mock("@/features/inbox/server/run-case", () => ({ runCase: vi.fn() }));

import { submitEmailAction } from "@/features/inbox/actions/submit-action";

const EMAIL = { from: "a@example.org", subject: "Hallo", body: "Text" };

describe("submitEmailAction", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-06T12:00:00Z"));
    mocks.headers = new Headers({ "x-forwarded-for": "203.0.113.7" });
    mocks.env.IP_HASH_SALT = "test-salt";
    const counts = new Map<string, number>();
    mocks.increment.mockImplementation(async (key, at) => {
      const id = `${key}|${at.getTime()}`;
      counts.set(id, (counts.get(id) ?? 0) + 1);
      return counts.get(id)!;
    });
    mocks.ingest.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it("fails closed without IP_HASH_SALT and never touches the limiter", async () => {
    mocks.env.IP_HASH_SALT = undefined;
    expect(await submitEmailAction(EMAIL)).toEqual({
      ok: false,
      error: "NOT_CONFIGURED",
    });
    expect(mocks.increment).not.toHaveBeenCalled();
    expect(mocks.ingest).not.toHaveBeenCalled();
  });

  it("redirects to the new case on success", async () => {
    await expect(submitEmailAction(EMAIL)).rejects.toThrow(
      "NEXT_REDIRECT /faelle/case-1",
    );
  });

  it("returns the reset time as an ISO string when the daily limit is hit", async () => {
    await expect(submitEmailAction(EMAIL)).rejects.toThrow("NEXT_REDIRECT");
    expect(await submitEmailAction(EMAIL)).toEqual({
      ok: false,
      error: "RATE_LIMIT_DAILY",
      resetAt: "2026-11-07T00:00:00.000Z",
    });
    expect(mocks.ingest).toHaveBeenCalledOnce();
  });

  it("stores only a hash of the IP in the limiter key", async () => {
    await expect(submitEmailAction(EMAIL)).rejects.toThrow("NEXT_REDIRECT");
    const keys = mocks.increment.mock.calls.map(([key]) => key);
    expect(keys).toEqual([expect.stringMatching(/^submit:[0-9a-f]{64}$/)]);
    expect(keys.join()).not.toContain("203.0.113.7");
  });

  it("puts requests without a forwarded IP into one shared bucket", async () => {
    mocks.headers = new Headers();
    await expect(submitEmailAction(EMAIL)).rejects.toThrow("NEXT_REDIRECT");
    expect(await submitEmailAction(EMAIL)).toMatchObject({
      error: "RATE_LIMIT_DAILY",
    });
  });
});
