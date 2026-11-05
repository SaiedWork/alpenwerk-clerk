// Records live LLM answers for all eval cases into seed/llm-cache.json (the replay cache).
// Usage: pnpm seed-cache [--force]   (costs real money: ~24 short Haiku calls)
import { writeFileSync } from "node:fs";
import { extractFromEmail } from "@/agent/llm/extract";
import { getModel } from "@/agent/llm/provider";
import { env } from "@/lib/env";
import { loadEvalCases } from "../evals/loader";
import { readSeedCache, SEED_CACHE_PATH } from "../evals/memory-stores";
import { recordExtractions } from "../evals/record";

// Always live, whatever LLM_PROVIDER says: this script exists to call the model.
const model = getModel({
  provider: "anthropic",
  anthropicApiKey: env.ANTHROPIC_API_KEY,
  anthropicModel: env.ANTHROPIC_MODEL,
});
if (!model) throw new Error("No live model configured");

const force = process.argv.includes("--force");
const cases = loadEvalCases();
console.log(
  `Recording ${cases.length} cases with ${env.ANTHROPIC_MODEL}${force ? " (force)" : ""} ...`,
);

const { entries, stats } = await recordExtractions({
  cases,
  existing: readSeedCache() ?? [],
  extract: ({ subject, body }) => extractFromEmail({ subject, body, model }),
  force,
  onProgress: (line) => console.log(`  ${line}`),
});

writeFileSync(SEED_CACHE_PATH, `${JSON.stringify(entries, null, 2)}\n`);
console.log(
  `Wrote ${entries.length} entries. Live calls: ${stats.calls}, reused: ${stats.skipped}, ` +
    `tokens: ${stats.tokensIn} in / ${stats.tokensOut} out, est. cost: $${stats.estCostUsd.toFixed(4)}`,
);
if (stats.failures.length > 0) {
  console.error(`${stats.failures.length} failed:`);
  for (const f of stats.failures) console.error(`  ${f.id}: ${f.message}`);
  process.exitCode = 1;
}
