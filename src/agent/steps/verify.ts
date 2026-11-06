import { addressDifferences, bankDifferences } from "@/agent/executor/targets";
import { PipelineStateError } from "@/agent/pipeline/state";
import type { Step } from "@/agent/pipeline/types";
import { planFromParams } from "./plan";

export type VerifyErrorCode = "VERIFY_MISMATCH" | "VERIFY_UNAVAILABLE";

/**
 * The legacy system does not hold what was written. `fields` names what differs, never the
 * values, so it can be stored on the case without personal data.
 */
export class VerifyError extends Error {
  constructor(
    readonly code: VerifyErrorCode,
    message: string,
    readonly fields: string[] = [],
  ) {
    super(message);
    this.name = "VerifyError";
  }
}

/**
 * Step 5: re-opens the record in the legacy system and checks it holds the target values the
 * execute step wrote. A difference fails the case (`VERIFY_MISMATCH`); nothing is rolled back,
 * a human decides. Read-only, so re-running is always safe.
 */
export const verify: Step = async ({ state, deps }) => {
  if (!state.evaluation || state.executed === undefined) {
    throw new PipelineStateError("execute");
  }
  const { normalizedParams: params } = state.evaluation;
  if (!state.executed || params === null || params.kind === "termination") {
    return {
      status: "skipped",
      payload: { reason: "NOTHING_TO_VERIFY" },
      casePatch: {},
    };
  }
  if (!deps.readback || !state.snapshot) {
    throw new VerifyError(
      "VERIFY_UNAVAILABLE",
      "There is no way to read the record back.",
    );
  }

  const policyNo = state.snapshot.policyNo;
  const plan = planFromParams(params);
  let fields: string[];
  if (plan.kind === "address_change") {
    const current = await deps.readback.readAddress(policyNo);
    fields = current ? addressDifferences(current, plan.target) : ["record"];
  } else {
    const current = await deps.readback.readBank(policyNo);
    fields = current ? bankDifferences(current, plan.target) : ["record"];
  }
  if (fields.length > 0) {
    throw new VerifyError(
      "VERIFY_MISMATCH",
      `The legacy system differs from the target in: ${fields.join(", ")}.`,
      fields,
    );
  }
  return {
    status: "succeeded",
    payload: { kind: plan.kind, verified: true },
    casePatch: { status: "VERIFIED" },
  };
};
