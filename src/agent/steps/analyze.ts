import { normalizeExtraction } from "@/agent/llm/normalize";
import { resolveExtraction } from "@/agent/llm/resolve";
import type { Step } from "@/agent/pipeline/types";

/** Step 1: one LLM call (or cache hit), then normalization. Nothing here decides anything. */
export const analyze: Step = async ({ case: c, deps, now }) => {
  const resolved = await resolveExtraction(
    { subject: c.subject, body: c.body, caseId: c.id },
    { ...deps.llm(), now: () => now },
  );
  const extraction = normalizeExtraction(resolved.extraction, now);

  return {
    status: "succeeded",
    payload: { extraction, source: resolved.source, model: resolved.model },
    casePatch: {
      status: "ANALYZED",
      intent: extraction.primaryIntent,
      confidence: extraction.confidence,
      extracted: extraction,
      policyNo: extraction.policyNo,
    },
  };
};
