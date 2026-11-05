import { normalizeExtraction, toRuleInput } from "@/agent/llm/normalize";
import { ReplayMissError } from "@/agent/llm/errors";
import { resolveExtraction } from "@/agent/llm/resolve";
import type { CacheStore, CallStore } from "@/agent/llm/stores";
import { evaluate } from "@/agent/rules/engine";
import type { EvalCase } from "./schema";
import {
  errorResult,
  scoreCase,
  summarize,
  type CaseResult,
  type EvalSummary,
} from "./score";
import { EVAL_NOW, findFixture, snapshotFromFixture } from "./snapshot";

export interface EvalRun {
  results: CaseResult[];
  summary: EvalSummary;
}

/**
 * Replay run: cache -> normalize -> rules, using the production resolver with no live model.
 * A cache miss is reported for that case; it does not abort the run.
 */
export async function runEvals(options: {
  cases: EvalCase[];
  cache: CacheStore;
  calls: CallStore;
  now?: Date;
}): Promise<EvalRun> {
  const { cases, cache, calls, now = EVAL_NOW } = options;
  const results: CaseResult[] = [];

  for (const c of cases) {
    try {
      const resolved = await resolveExtraction(
        { subject: c.email.subject, body: c.email.body, caseId: null },
        {
          cache,
          calls,
          model: null,
          modelName: "replay",
          dailyCap: 0,
          now: () => now,
        },
      );
      const fixture = findFixture(c.policyFixture, now);
      const extraction = normalizeExtraction(resolved.extraction, now);
      const evaluation = evaluate(
        toRuleInput(extraction, {
          senderEmail: c.email.from,
          snapshot: fixture ? snapshotFromFixture(fixture) : null,
          now,
        }),
      );
      results.push(scoreCase(c, extraction, evaluation));
    } catch (error) {
      if (!(error instanceof ReplayMissError)) throw error;
      results.push(errorResult(c, "no cached extraction (re-run seed-cache)"));
    }
  }
  return { results, summary: summarize(results) };
}
