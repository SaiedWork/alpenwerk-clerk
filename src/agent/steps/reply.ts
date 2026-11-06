import { PipelineStateError } from "@/agent/pipeline/state";
import type { Step } from "@/agent/pipeline/types";
import { render } from "@/agent/templates/render";
import { selectTemplate } from "@/agent/templates/select";
import { buildReplyVars } from "./reply-vars";

/**
 * Step 6: chooses a German template for the outcome, renders it and stores the reply. The LLM
 * never writes customer-facing text. A rendering problem fails the step with its code and stores
 * nothing.
 *
 * No human in the loop (`AUTO_EXECUTE`, `REPLY_ONLY`): the reply is "sent" (simulated) right
 * away and the case is `DONE`. A case a human reviewed keeps a draft and stays `REPLY_READY`
 * until the reviewer edits and sends it (`reply-actions.ts`).
 * Re-running replaces an untouched draft, never an edited or sent reply.
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

  const autoSend = state.evaluation.decision !== "NEEDS_REVIEW";
  await deps.store.saveReply(
    c.id,
    { templateKey, subject, body },
    { sent: autoSend },
  );
  if (autoSend) {
    await deps.audit?.append({
      caseId: c.id,
      actor: "agent",
      action: "reply.sent_simulated",
      details: { step: "reply" },
    });
  }
  return {
    status: "succeeded",
    // The text itself lives in `replies`; the timeline only says which template was used.
    payload: { templateKey, autoSent: autoSend },
    casePatch: { status: autoSend ? "DONE" : "REPLY_READY" },
  };
};
