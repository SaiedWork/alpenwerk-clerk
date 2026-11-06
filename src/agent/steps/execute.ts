import { PipelineStateError } from "@/agent/pipeline/state";
import type { Step } from "@/agent/pipeline/types";
import { maskIban } from "@/lib/iban";
import { ExecuteError, planFromParams } from "./plan";

/**
 * Step 4: carries out an address or bank change in the legacy system through the browser
 * driver. Parameters come only from the validated `normalizedParams` of the evaluate step, and
 * only address and bank changes can ever be written: terminations and `other` never reach the
 * driver, whatever the decision. Re-running is safe: the driver skips values already in place.
 */
export const execute: Step = async ({ case: c, state, deps }) => {
  if (!state.evaluation) throw new PipelineStateError("evaluate");
  const { decision, normalizedParams: params } = state.evaluation;

  if (deps.rejected) {
    return {
      status: "skipped",
      payload: { reason: "REJECTED" },
      casePatch: {},
    };
  }

  if (decision === "REPLY_ONLY") {
    return {
      status: "skipped",
      payload: { reason: "NO_ACTION" },
      casePatch: {},
    };
  }
  if (params === null || params.kind === "termination") {
    return {
      status: "skipped",
      payload: { reason: "NOT_AUTOMATABLE" },
      casePatch: {},
    };
  }
  if (!deps.writer) {
    return {
      status: "skipped",
      payload: { reason: "NO_BROWSER" },
      casePatch: {},
    };
  }
  if (!state.snapshot) {
    throw new ExecuteError(
      "EXECUTE_PRECONDITION_FAILED",
      "No policy was identified, so there is nothing to write to.",
    );
  }

  const policyNo = state.snapshot.policyNo;
  // Validate before anything is touched.
  const plan = planFromParams(params);

  await deps.store.updateCase(c.id, { status: "EXECUTING" });
  const outcome =
    plan.kind === "address_change"
      ? await deps.writer.updateAddress(policyNo, plan.target)
      : await deps.writer.updateBank(policyNo, plan.target);

  if (outcome === "no_mandate" || outcome === "policy_not_found") {
    throw new ExecuteError(
      "EXECUTE_PRECONDITION_FAILED",
      `The legacy system no longer allows the change (${outcome}).`,
    );
  }
  return {
    status: "succeeded",
    payload: {
      kind: plan.kind,
      outcome,
      // Never the full IBAN on the timeline.
      ...(params.kind === "bank_change"
        ? { ibanMasked: maskIban(params.iban) }
        : {}),
    },
    casePatch: { status: "EXECUTING" },
  };
};
