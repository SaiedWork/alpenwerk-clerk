// Runs the replay eval (committed cache, no model, no database) and writes public/eval-summary.json.
// Usage: pnpm eval:summary. CI runs it and fails if the committed file differs.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { loadEvalCases } from "../evals/loader";
import { createMemoryStores, readSeedCache } from "../evals/memory-stores";
import { formatReport } from "../evals/report";
import { runEvals } from "../evals/run";
import { buildEvalSummaryFile } from "../evals/summary";

const entries = readSeedCache();
if (entries === null) throw new Error("seed/llm-cache.json is missing");

const { results, summary } = await runEvals({
  cases: loadEvalCases(),
  ...createMemoryStores(entries),
});
console.log(`\n${formatReport(results, summary)}\n`);

// A miss means the cache is stale (prompt or schema version changed): do not write a summary.
if (summary.errors > 0) {
  throw new Error(`${summary.errors} case(s) without a cached extraction`);
}

const file = path.join(process.cwd(), "public", "eval-summary.json");
writeFileSync(
  file,
  `${JSON.stringify(buildEvalSummaryFile(summary, entries), null, 2)}\n`,
);
console.log(`Wrote ${path.relative(process.cwd(), file)}`);
