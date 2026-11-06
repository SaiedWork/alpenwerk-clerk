import type { AddressTarget, BankTarget } from "@/agent/executor/targets";
import { PipelineStateError } from "@/agent/pipeline/state";
import type { Step } from "@/agent/pipeline/types";
import type { NormalizedParams } from "@/agent/rules/engine";
import { maskIban } from "@/lib/iban";

export type ExecuteErrorCode =
  "EXECUTE_PARAMS_INVALID" | "EXECUTE_PRECONDITION_FAILED";

/** The change cannot be carried out as planned. Stored on the event row, never swallowed. */
export class ExecuteError extends Error {
  constructor(
    readonly code: ExecuteErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ExecuteError";
  }
}

type Plan =
  | { kind: "address_change"; target: AddressTarget }
  | { kind: "bank_change"; target: BankTarget };

type WritableParams = Exclude<NormalizedParams, { kind: "termination" }>;

function addressTarget(
  address: Extract<WritableParams, { kind: "address_change" }>["address"],
): AddressTarget {
  const { street, houseNo, plz, city, country } = address;
  // The rules block incomplete addresses before execution; this guards against a bypass.
  if (!street || !houseNo || !plz || !city) {
    throw new ExecuteError(
      "EXECUTE_PARAMS_INVALID",
      "The address is incomplete; the rules should have blocked it.",
    );
  }
  return { street, houseNo, plz, city, country };
}

/**
 * Step 4: carries out an address or bank change in the legacy system through the browser
 * driver. Parameters come only from the validated `normalizedParams` of the evaluate step, and
 * only address and bank changes can ever be written: terminations and `other` never reach the
 * driver, whatever the decision. Re-running is safe: the driver skips values already in place.
 */
export const execute: Step = async ({ case: c, state, deps }) => {
  if (!state.evaluation) throw new PipelineStateError("evaluate");
  const { decision, normalizedParams: params } = state.evaluation;

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
  const plan: Plan =
    params.kind === "address_change"
      ? { kind: "address_change", target: addressTarget(params.address) }
      : {
          kind: "bank_change",
          target: { iban: params.iban, holder: params.accountHolder },
        };

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
