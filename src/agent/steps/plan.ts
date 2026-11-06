import type { AddressTarget, BankTarget } from "@/agent/executor/targets";
import type { NormalizedParams } from "@/agent/rules/engine";

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

/** What execute writes and verify reads back: one shape, built once from the validated params. */
export type Plan =
  | { kind: "address_change"; target: AddressTarget }
  | { kind: "bank_change"; target: BankTarget };

type WritableParams = Exclude<NormalizedParams, { kind: "termination" }>;

/** Maps validated params to the target values; throws if a required part is missing. */
export function planFromParams(params: WritableParams): Plan {
  if (params.kind === "bank_change") {
    return {
      kind: "bank_change",
      target: { iban: params.iban, holder: params.accountHolder },
    };
  }
  const { street, houseNo, plz, city, country } = params.address;
  // The rules block incomplete addresses before execution; this guards against a bypass.
  if (!street || !houseNo || !plz || !city) {
    throw new ExecuteError(
      "EXECUTE_PARAMS_INVALID",
      "The address is incomplete; the rules should have blocked it.",
    );
  }
  return {
    kind: "address_change",
    target: { street, houseNo, plz, city, country },
  };
}
