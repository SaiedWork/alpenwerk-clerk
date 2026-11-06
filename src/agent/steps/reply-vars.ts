import type {
  MissingField,
  TemplateKey,
  TemplateVars,
} from "@/agent/templates/render";
import type { PipelineState } from "@/agent/pipeline/types";
import { maskIban } from "@/lib/iban";

/**
 * Template variables, built only from validated data of earlier steps: the policy number read
 * from the legacy system, the normalized params of the evaluate step, the normalized extraction.
 * A missing piece becomes an empty string; `render` then fails with TEMPLATE_VARIABLE_MISSING,
 * so a reply is never built from guesses.
 */
export function buildReplyVars(
  key: TemplateKey,
  state: PipelineState,
): TemplateVars<TemplateKey> {
  const policyNo = state.snapshot?.policyNo ?? "";
  const params = state.evaluation?.normalizedParams ?? null;

  switch (key) {
    case "address_confirmed": {
      const a = params?.kind === "address_change" ? params.address : null;
      return {
        policyNo,
        street: a?.street ?? "",
        houseNo: a?.houseNo ?? "",
        plz: a?.plz ?? "",
        city: a?.city ?? "",
      };
    }
    case "bank_confirmed":
      return {
        policyNo,
        maskedIban: params?.kind === "bank_change" ? maskIban(params.iban) : "",
      };
    case "termination_received":
      return { policyNo };
    case "request_missing_info":
      return { missing: missingFields(state) };
    default:
      return {};
  }
}

/** What the customer has to supply again, derived from the rule codes and the extraction. */
function missingFields(state: PipelineState): MissingField[] {
  const codes = state.evaluation?.reasonCodes ?? [];
  const a = state.extraction?.address;
  const missing: MissingField[] = [];
  if (codes.includes("ADDR_INCOMPLETE")) {
    if (!a?.street) missing.push("street");
    if (!a?.houseNo) missing.push("house_no");
    if (!a?.plz) missing.push("plz");
    if (!a?.city) missing.push("city");
  }
  if (codes.includes("ADDR_PLZ_INVALID") && !missing.includes("plz")) {
    missing.push("plz");
  }
  if (codes.includes("BANK_IBAN_INVALID")) missing.push("iban");
  return missing;
}
