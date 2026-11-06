import { stateFromEvents } from "@/agent/pipeline/state";
import type { StoredEvent } from "@/agent/pipeline/types";
import { buildReplyVars } from "@/agent/steps/reply-vars";
import { render, type RenderedReply } from "@/agent/templates/render";
import { selectTemplate } from "@/agent/templates/select";

export type ReplyPreview = {
  /** The reply if the reviewer approves (assumes the browser writes the change). */
  approve: RenderedReply;
  /** The reply if the reviewer rejects. */
  reject: RenderedReply;
};

/**
 * What the customer would receive after each review outcome. Pure and never stored: the real
 * reply is created by the reply step after the decision. Uses the same selection and rendering
 * as that step. Returns `null` if a stored payload is unreadable or a template cannot render.
 */
export function previewReply(events: StoredEvent[]): ReplyPreview | null {
  try {
    const done = events.filter(
      (e) => e.status === "succeeded" || e.status === "skipped",
    );
    const state = stateFromEvents(done);
    const { evaluation, extraction } = state;
    if (!evaluation || !extraction) return null;

    const base = {
      decision: evaluation.decision,
      intent: extraction.primaryIntent,
      reasonCodes: evaluation.reasonCodes,
    };
    const preview = (executed: boolean, review: "approved" | "rejected") => {
      const key = selectTemplate({ ...base, executed, review });
      return render(key, buildReplyVars(key, state));
    };
    return {
      approve: preview(true, "approved"),
      reject: preview(false, "rejected"),
    };
  } catch {
    return null;
  }
}
