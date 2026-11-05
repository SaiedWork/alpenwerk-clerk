import { describe, expect, it, vi } from "vitest";
import { computeCacheKey } from "@/agent/llm/cache-key";
import {
  llmFailureMessageDe,
  LlmBudgetError,
  LlmError,
  ReplayMissError,
} from "@/agent/llm/errors";
import type { extractFromEmail } from "@/agent/llm/extract";
import { LlmInputError } from "@/agent/llm/limits";
import { resolveExtraction, type ResolveDeps } from "@/agent/llm/resolve";
import type { Extraction } from "@/agent/llm/schema";
import type { CacheStore, CallRecord, CallStore } from "@/agent/llm/stores";
import { t } from "@/lib/i18n-de";

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const input = { subject: "IBAN", body: "Neue IBAN bitte.", caseId: "case-1" };

const extraction: Extraction = {
  intents: ["bank_change"],
  primary_intent: "bank_change",
  confidence: 0.9,
  language: "de",
  policy_no: "AW-100101",
  sender_name: null,
  date_of_birth: null,
  iban: "DE89370400440532013000",
  account_holder: null,
  effective_date: null,
};

class FakeCache implements CacheStore {
  rows = new Map<
    string,
    { response: unknown; model: string; seeded: boolean }
  >();
  async get(key: string) {
    return this.rows.get(key) ?? null;
  }
  async put(row: {
    key: string;
    response: unknown;
    model: string;
    seeded: boolean;
  }) {
    this.rows.set(row.key, row);
  }
}

class FakeCalls implements CallStore {
  records: (CallRecord & { at: Date })[] = [];
  constructor(private clock: () => Date) {}
  async insert(record: CallRecord) {
    this.records.push({ ...record, at: this.clock() });
  }
  async countLiveSince(since: Date) {
    return this.records.filter((r) => !r.cached && r.at >= since).length;
  }
}

function setup(overrides: Partial<ResolveDeps> = {}) {
  let now = new Date("2026-11-05T10:00:00Z");
  const clock = () => now;
  const cache = new FakeCache();
  const calls = new FakeCalls(clock);
  const extract = vi.fn<typeof extractFromEmail>(async () => ({
    extraction,
    usage: { tokensIn: 900, tokensOut: 150 },
    model: "claude-haiku-5-5",
  }));
  const deps: ResolveDeps = {
    cache,
    calls,
    model: {} as ResolveDeps["model"],
    modelName: "claude-haiku-5-5",
    dailyCap: 2,
    now: clock,
    extract,
    ...overrides,
  };
  return { deps, cache, calls, extract, setNow: (d: Date) => (now = d) };
}

describe("resolveExtraction", () => {
  it("answers from the cache without a live call and records a cached call", async () => {
    const { deps, cache, calls, extract } = setup();
    cache.rows.set(computeCacheKey(input.subject, input.body), {
      response: extraction,
      model: "claude-haiku-5-5",
      seeded: true,
    });
    const result = await resolveExtraction(input, deps);
    expect(result).toMatchObject({ source: "cache", extraction });
    expect(extract).not.toHaveBeenCalled();
    expect(calls.records).toEqual([
      expect.objectContaining({ cached: true, caseId: "case-1", tokensIn: 0 }),
    ]);
  });

  it("calls the model on a miss, caches the answer and records tokens and cost", async () => {
    const { deps, cache, calls, extract } = setup();
    const result = await resolveExtraction(input, deps);
    expect(result.source).toBe("live");
    expect(extract).toHaveBeenCalledOnce();
    expect(
      cache.rows.get(computeCacheKey(input.subject, input.body)),
    ).toMatchObject({
      response: extraction,
      seeded: false,
    });
    expect(calls.records[0]).toMatchObject({
      cached: false,
      tokensIn: 900,
      tokensOut: 150,
      estCostUsd: 0.000165,
    });
    // the second identical email is now a cache hit
    expect((await resolveExtraction(input, deps)).source).toBe("cache");
    expect(extract).toHaveBeenCalledOnce();
  });

  it("replay mode: a miss throws ReplayMissError, a hit still works", async () => {
    const { deps, cache, extract } = setup({ model: null });
    await expect(resolveExtraction(input, deps)).rejects.toBeInstanceOf(
      ReplayMissError,
    );
    cache.rows.set(computeCacheKey(input.subject, input.body), {
      response: extraction,
      model: "m",
      seeded: true,
    });
    expect((await resolveExtraction(input, deps)).source).toBe("cache");
    expect(extract).not.toHaveBeenCalled();
  });

  it("refuses a live call once the daily cap of live calls is reached", async () => {
    const { deps, extract } = setup();
    await resolveExtraction({ ...input, body: "eins" }, deps);
    await resolveExtraction({ ...input, body: "zwei" }, deps);
    await expect(
      resolveExtraction({ ...input, body: "drei" }, deps),
    ).rejects.toMatchObject({ code: "DAILY_CAP_REACHED", cap: 2 });
    expect(extract).toHaveBeenCalledTimes(2);
  });

  it("cached answers still work when the cap is reached, and do not count towards it", async () => {
    const { deps, calls } = setup({ dailyCap: 1 });
    await resolveExtraction({ ...input, body: "eins" }, deps);
    for (let i = 0; i < 5; i += 1) {
      expect(
        (await resolveExtraction({ ...input, body: "eins" }, deps)).source,
      ).toBe("cache");
    }
    expect(calls.records.filter((r) => !r.cached)).toHaveLength(1);
    await expect(
      resolveExtraction({ ...input, body: "neu" }, deps),
    ).rejects.toBeInstanceOf(LlmBudgetError);
  });

  it("the cap resets at Berlin midnight", async () => {
    const { deps, setNow } = setup({ dailyCap: 1 });
    setNow(new Date("2026-11-05T22:30:00Z")); // 23:30 Berlin
    await resolveExtraction({ ...input, body: "eins" }, deps);
    await expect(
      resolveExtraction({ ...input, body: "zwei" }, deps),
    ).rejects.toBeInstanceOf(LlmBudgetError);
    setNow(new Date("2026-11-05T23:30:00Z")); // 00:30 Berlin, next day
    expect(
      (await resolveExtraction({ ...input, body: "zwei" }, deps)).source,
    ).toBe("live");
  });

  it("a failed live call caches nothing, counts against the cap and rethrows", async () => {
    const failing = vi.fn<typeof extractFromEmail>(async () => {
      throw new LlmError("LLM_PROVIDER_ERROR", "boom");
    });
    const { deps, cache, calls } = setup({ extract: failing, dailyCap: 1 });
    await expect(resolveExtraction(input, deps)).rejects.toMatchObject({
      code: "LLM_PROVIDER_ERROR",
    });
    expect(cache.rows.size).toBe(0);
    expect(calls.records).toEqual([
      expect.objectContaining({
        cached: false,
        tokensIn: 0,
        model: "claude-haiku-5-5",
      }),
    ]);
    await expect(resolveExtraction(input, deps)).rejects.toBeInstanceOf(
      LlmBudgetError,
    );
  });

  it("does not record an attempt for input errors", async () => {
    const tooLong = vi.fn<typeof extractFromEmail>(async () => {
      throw new LlmInputError("too long");
    });
    const { deps, calls } = setup({ extract: tooLong });
    await expect(resolveExtraction(input, deps)).rejects.toBeInstanceOf(
      LlmInputError,
    );
    expect(calls.records).toHaveLength(0);
  });

  it("treats a corrupt cache row as a miss and heals it with the live answer", async () => {
    const { deps, cache, extract } = setup();
    const key = computeCacheKey(input.subject, input.body);
    cache.rows.set(key, {
      response: { primary_intent: "refund" },
      model: "x",
      seeded: true,
    });
    const result = await resolveExtraction(input, deps);
    expect(result.source).toBe("live");
    expect(extract).toHaveBeenCalledOnce();
    expect(cache.rows.get(key)).toMatchObject({
      response: extraction,
      seeded: false,
    });
  });
});

describe("llmFailureMessageDe", () => {
  it("maps LLM failures to German messages and ignores other errors", () => {
    expect(llmFailureMessageDe(new LlmBudgetError(150))).toBe(
      t.llm.dailyCapReached,
    );
    expect(llmFailureMessageDe(new ReplayMissError())).toBe(t.llm.replayMiss);
    expect(llmFailureMessageDe(new LlmInputError("x"))).toBe(
      t.llm.inputTooLong,
    );
    expect(llmFailureMessageDe(new LlmError("LLM_TIMEOUT", "x"))).toBe(
      t.llm.failed,
    );
    expect(llmFailureMessageDe(new Error("other"))).toBeNull();
  });

  it("uses the exact German cap message from the spec", () => {
    expect(t.llm.dailyCapReached).toBe(
      "Tageslimit für Live-KI erreicht — bitte Beispiel-E-Mails verwenden.",
    );
  });
});
