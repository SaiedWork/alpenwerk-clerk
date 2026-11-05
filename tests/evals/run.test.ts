import { describe, expect, it, vi } from "vitest";
import type { Extraction } from "@/agent/llm/schema";
import { loadEvalCases } from "../../evals/loader";
import { createMemoryStores } from "../../evals/memory-stores";
import { runEvals } from "../../evals/run";
import { cacheEntry, perfectEntries, perfectRaw } from "./perfect-model";

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const cases = loadEvalCases();
const byId = (id: string) => {
  const c = cases.find((x) => x.id === id);
  if (!c) throw new Error(`missing case ${id}`);
  return c;
};

async function run(entries: ReturnType<typeof perfectEntries>) {
  return runEvals({ cases, ...createMemoryStores(entries) });
}

describe("runEvals", () => {
  it("scores a perfect model at 100% on all 24 cases", async () => {
    const { summary, results } = await run(perfectEntries(cases));
    expect(results).toHaveLength(24);
    expect(summary).toMatchObject({
      errors: 0,
      intentAccuracy: 1,
      intentsAccuracy: 1,
      fieldAccuracy: 1,
      decisionAccuracy: 1,
      reasonCodeAccuracy: 1,
      allCorrect: 24,
    });
  });

  it("reports a cache miss per case without aborting the run", async () => {
    const entries = perfectEntries(cases).slice(1);
    const { results, summary } = await run(entries);
    expect(results[0]).toMatchObject({
      error: expect.stringContaining("no cached"),
      firstDivergence: "no_extraction",
    });
    expect(summary.errors).toBe(1);
    expect(summary.allCorrect).toBe(23);
  });

  it("attributes a wrong IBAN to fields and the follow-on decision change", async () => {
    const b01 = byId("B01");
    const raw = perfectRaw(b01);
    if (raw.primary_intent !== "bank_change") throw new Error("unexpected");
    // Valid checksum but a different account number: only the field label is wrong.
    const wrong = { ...raw, iban: "DE02120300000000202051" };
    const entries = perfectEntries(cases).map((e) =>
      e.key === cacheEntry(b01, null).key ? { ...e, response: wrong } : e,
    );
    const { results } = await run(entries);
    const r = results.find((x) => x.id === "B01");
    expect(r).toMatchObject({
      intentOk: true,
      firstDivergence: "fields",
      decisionOk: true,
    });
    expect(r?.fieldMisses[0]).toMatch(/^iban:/);
  });

  it("attributes a wrong intent to the intent stage", async () => {
    const t01 = byId("T01");
    const wrong: Extraction = {
      intents: ["other"],
      primary_intent: "other",
      confidence: 0.9,
      language: "de",
      policy_no: null,
      sender_name: null,
      date_of_birth: null,
      summary: null,
    };
    const entries = perfectEntries(cases).map((e) =>
      e.key === cacheEntry(t01, null).key ? { ...e, response: wrong } : e,
    );
    const { results, summary } = await run(entries);
    expect(results.find((x) => x.id === "T01")).toMatchObject({
      intentOk: false,
      firstDivergence: "intent",
    });
    expect(summary.intentAccuracy).toBeCloseTo(23 / 24);
  });
});
