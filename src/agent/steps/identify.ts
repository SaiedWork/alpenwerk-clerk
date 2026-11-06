import type { Step } from "@/agent/pipeline/types";
import { PipelineStateError } from "@/agent/pipeline/state";

/**
 * Step 2: reads the policy named in the email through the snapshot reader. A missing policy
 * number or an unknown policy is a result (`snapshot: null`), not an error: the rules
 * turn it into `ID_POLICY_NOT_FOUND` where it matters.
 */
export const identify: Step = async ({ state, deps }) => {
  if (!state.extraction) throw new PipelineStateError("analyze");
  const { policyNo } = state.extraction;

  if (policyNo === null) {
    return {
      status: "skipped",
      payload: { snapshot: null, reason: "NO_POLICY_NUMBER" },
      casePatch: { status: "IDENTIFIED" },
    };
  }
  const snapshot = await deps.reader.readPolicy(policyNo);
  return {
    status: "succeeded",
    payload: { snapshot },
    casePatch: { status: "IDENTIFIED" },
  };
};
