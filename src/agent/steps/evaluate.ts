import { toRuleInput } from "@/agent/llm/normalize";
import { PipelineStateError } from "@/agent/pipeline/state";
import type { Step } from "@/agent/pipeline/types";
import { evaluate as evaluateRules } from "@/agent/rules/engine";

/**
 * Step 3: the pure rule engine decides. Only `NEEDS_REVIEW` changes the status to
 * `AWAITING_REVIEW`; execute and reply (Day 3) pick up the other decisions from `EVALUATED`.
 */
export const evaluate: Step = async ({ case: c, state, now }) => {
  if (!state.extraction || state.snapshot === undefined) {
    throw new PipelineStateError("identify");
  }
  const evaluation = evaluateRules(
    toRuleInput(state.extraction, {
      senderEmail: c.fromEmail,
      snapshot: state.snapshot,
      now,
    }),
  );

  return {
    status: "succeeded",
    payload: {
      decision: evaluation.decision,
      reasonCodes: evaluation.reasonCodes,
      results: evaluation.results,
      normalizedParams: evaluation.normalizedParams,
    },
    casePatch: {
      status:
        evaluation.decision === "NEEDS_REVIEW"
          ? "AWAITING_REVIEW"
          : "EVALUATED",
      decision: evaluation.decision,
      reasonCodes: evaluation.reasonCodes,
    },
  };
};
