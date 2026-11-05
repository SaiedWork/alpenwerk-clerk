// Scores the live model on all eval cases without touching seed/llm-cache.json.
// Usage: pnpm eval:live   (costs real money: ~24 short Haiku calls)
import { extractFromEmail } from "@/agent/llm/extract";
import { getModel } from "@/agent/llm/provider";
import { env } from "@/lib/env";
import { loadEvalCases } from "../evals/loader";
import { createMemoryStores } from "../evals/memory-stores";
import { recordExtractions } from "../evals/record";
import { formatReport } from "../evals/report";
import { runEvals } from "../evals/run";

const model = getModel({
  provider: "anthropic",
  anthropicApiKey: env.ANTHROPIC_API_KEY,
  anthropicModel: env.ANTHROPIC_MODEL,
});
if (!model) throw new Error("No live model configured");

const cases = loadEvalCases();
const { entries, stats } = await recordExtractions({
  cases,
  existing: [],
  extract: ({ subject, body }) => extractFromEmail({ subject, body, model }),
  onProgress: (line) => console.log(`  ${line}`),
});
const { results, summary } = await runEvals({
  cases,
  ...createMemoryStores(entries),
});

console.log(`\n${formatReport(results, summary)}\n`);
console.log(
  `Live calls: ${stats.calls}, tokens: ${stats.tokensIn} in / ${stats.tokensOut} out, est. cost: $${stats.estCostUsd.toFixed(4)}`,
);
if (stats.failures.length > 0) process.exitCode = 1;
