import { describe, expect, it } from "vitest";
import { loadEvalCases } from "./loader";
import { createMemoryStores, readSeedCache } from "./memory-stores";
import { formatReport } from "./report";
import { runEvals } from "./run";

const entries = readSeedCache();

// Replay eval against the committed cache. Skipped until `seed/llm-cache.json` exists.
// Accuracy thresholds are deliberately not asserted yet: they follow the first live numbers.
describe.skipIf(entries === null)("replay eval", () => {
  it("scores every case and prints the accuracy report", async () => {
    const cases = loadEvalCases();
    const { results, summary } = await runEvals({
      cases,
      ...createMemoryStores(entries ?? []),
    });

    console.log(`\n${formatReport(results, summary)}\n`);

    expect(results).toHaveLength(cases.length);
    // A miss means the cache is stale (prompt or schema version changed), not that the model is bad.
    expect(summary.errors).toBe(0);
  });
});
