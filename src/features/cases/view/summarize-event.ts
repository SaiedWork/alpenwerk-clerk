import { z } from "zod";
import {
  analyzePayloadSchema,
  evaluatePayloadSchema,
  identifyPayloadSchema,
} from "@/agent/pipeline/state";
import type { EventStatus, StepName } from "@/agent/pipeline/types";
import { t } from "@/lib/i18n-de";

const s = t.console.case.summary;

const failedPayload = z.object({ code: z.string(), messageDe: z.string() });
const reasonPayload = z.object({ reason: z.string() });
const executePayload = z.object({ outcome: z.string() });

export type EventSummary = {
  /** One short German sentence, or null when there is nothing useful to say. */
  text: string | null;
  /** Stable error code of a failed step. Shown next to the German message. */
  errorCode: string | null;
};

const NONE: EventSummary = { text: null, errorCode: null };
const text = (value: string): EventSummary => ({
  text: value,
  errorCode: null,
});

const EXECUTE_SKIP_REASONS: Record<string, string> = {
  REJECTED: s.executeRejected,
  NO_ACTION: s.executeNoAction,
  NOT_AUTOMATABLE: s.executeNotAutomatable,
  NO_BROWSER: s.executeNoBrowser,
};

/**
 * Turns a stored event payload into a short German sentence for the timeline. Raw
 * payloads (snapshots, extracted values) are never shown. Anything unreadable gives no
 * summary instead of a guess.
 */
export function summarizeEvent(
  step: string,
  status: EventStatus,
  payload: unknown,
): EventSummary {
  if (status === "failed") {
    const failed = failedPayload.safeParse(payload);
    return failed.success
      ? { text: failed.data.messageDe, errorCode: failed.data.code }
      : NONE;
  }
  if (status === "started") return NONE;

  switch (step as StepName) {
    case "analyze": {
      const p = analyzePayloadSchema.safeParse(payload);
      if (!p.success) return NONE;
      const { primaryIntent, confidence } = p.data.extraction;
      const source = p.data.source === "cache" ? s.analyzeCache : s.analyzeLive;
      return text(
        `${s.analyze
          .replace("{intent}", t.console.intent[primaryIntent])
          .replace(
            "{confidence}",
            String(Math.round(confidence * 100)),
          )} (${source})`,
      );
    }
    case "identify": {
      const p = identifyPayloadSchema.safeParse(payload);
      if (!p.success) return NONE;
      return text(p.data.snapshot ? s.policyFound : s.policyNotFound);
    }
    case "evaluate": {
      const p = evaluatePayloadSchema.safeParse(payload);
      return p.success
        ? text(
            s.evaluate.replace(
              "{decision}",
              t.console.decision[p.data.decision],
            ),
          )
        : NONE;
    }
    case "execute": {
      if (status === "skipped") {
        const p = reasonPayload.safeParse(payload);
        const reason = p.success ? EXECUTE_SKIP_REASONS[p.data.reason] : null;
        return reason ? text(reason) : NONE;
      }
      const p = executePayload.safeParse(payload);
      if (!p.success) return NONE;
      return text(
        p.data.outcome === "unchanged" ? s.executeUnchanged : s.executeChanged,
      );
    }
    case "verify":
      return text(status === "skipped" ? s.nothingToVerify : s.verified);
    case "reply": {
      const p = z.object({ autoSent: z.boolean() }).safeParse(payload);
      return text(
        p.success && p.data.autoSent ? s.replyAutoSent : s.replyCreated,
      );
    }
    default:
      return NONE;
  }
}
