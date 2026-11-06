import { PipelineStateError } from "@/agent/pipeline/state";
import type { Step } from "@/agent/pipeline/types";
import { render } from "@/agent/templates/render";
import { selectTemplate } from "@/agent/templates/select";
import { buildReplyVars } from "./reply-vars";

/**
 * Step 6: chooses a German template for the outcome, renders it and stores the draft. Sending
 * is simulated later; the LLM never writes customer-facing text. A rendering problem fails the
 * step with its code and stores nothing. Re-running replaces the draft (not an edited one).
 */
export const reply: Step = async ({ case: c, state, deps }) => {
  if (!state.evaluation || !state.extraction) {
    throw new PipelineStateError("evaluate");
  }
  const review = deps.rejected
    ? "rejected"
    : deps.approved
      ? "approved"
      : "none";

  const templateKey = selectTemplate({
    decision: state.evaluation.decision,
    intent: state.extraction.primaryIntent,
    reasonCodes: state.evaluation.reasonCodes,
    executed: state.executed === true,
    review,
  });
  const { subject, body } = render(
    templateKey,
    buildReplyVars(templateKey, state),
  );

  await deps.store.saveReply(c.id, { templateKey, subject, body });
  return {
    status: "succeeded",
    // The text itself lives in `replies`; the timeline only says which template was used.
    payload: { templateKey },
    casePatch: { status: "REPLY_READY" },
  };
};
