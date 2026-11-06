import type { CaseStatus } from "@/agent/pipeline/types";
import { t } from "@/lib/i18n-de";
import { ToneBadge, type Tone } from "./tone-badge";

const STATUS_TONE: Record<CaseStatus, Tone> = {
  RECEIVED: "neutral",
  ANALYZED: "neutral",
  IDENTIFIED: "neutral",
  EVALUATED: "neutral",
  AWAITING_REVIEW: "warning",
  EXECUTING: "neutral",
  VERIFIED: "neutral",
  REPLY_READY: "info",
  DONE: "success",
  FAILED: "danger",
  REJECTED: "danger",
};

export function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <ToneBadge tone={STATUS_TONE[status]}>{t.console.status[status]}</ToneBadge>
  );
}
