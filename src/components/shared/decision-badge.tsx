import type { Decision } from "@/agent/rules/types";
import { t } from "@/lib/i18n-de";
import { ToneBadge, type Tone } from "./tone-badge";

const DECISION_TONE: Record<Decision, Tone> = {
  AUTO_EXECUTE: "success",
  NEEDS_REVIEW: "warning",
  REPLY_ONLY: "info",
};

/** Cases that are not evaluated yet have no decision; shown as an en dash. */
export function DecisionBadge({ decision }: { decision: Decision | null }) {
  if (!decision) return <span className="text-muted-foreground">–</span>;
  return (
    <ToneBadge tone={DECISION_TONE[decision]}>
      {t.console.decision[decision]}
    </ToneBadge>
  );
}
