import { STEP_NAMES } from "@/agent/pipeline/types";
import { auditDetailsSchema } from "@/db/audit";
import { formatHandlingTime } from "@/features/cases/format";
import { t } from "@/lib/i18n-de";

const a = t.console.audit;

const ACTIONS: Record<string, string> = a.actions;
const STEP_LABELS: Record<string, string> = t.console.case.steps;
const STEP_STATUS: Record<string, string> = a.stepStatus;
const SOURCES: Record<string, string> = a.detail.source;
const DECISIONS: Record<string, string> = t.console.decision;
const STEP_ACTION = new RegExp(`^step\\.(${STEP_NAMES.join("|")})\\.(\\w+)$`);

/** German label of an audit action; an unknown action is shown as stored, never hidden. */
export function auditActionLabel(action: string): string {
  const known = ACTIONS[action];
  if (known) return known;
  const match = STEP_ACTION.exec(action);
  if (match) {
    return a.step
      .replace("{step}", STEP_LABELS[match[1]] ?? match[1])
      .replace("{status}", STEP_STATUS[match[2]] ?? match[2]);
  }
  return action;
}

/**
 * One short German line from the stored details. The details schema only allows harmless keys,
 * and they are re-validated here; anything unreadable gives no line instead of a guess.
 */
export function auditDetailsSummary(details: unknown): string | null {
  const parsed = auditDetailsSchema.safeParse(details ?? {});
  if (!parsed.success) return null;
  const d = parsed.data;
  const d_ = a.detail;
  const parts: string[] = [];
  if (d.source) parts.push(SOURCES[d.source] ?? d.source);
  if (d.reviewerLabel) {
    parts.push(d_.by.replace("{reviewer}", d.reviewerLabel));
  }
  if (d.hasNote) parts.push(d_.withNote);
  if (d.decision) {
    parts.push(
      d_.decision.replace("{decision}", DECISIONS[d.decision] ?? d.decision),
    );
  }
  if (d.reasonCodes?.length) {
    parts.push(d_.reasons.replace("{codes}", d.reasonCodes.join(", ")));
  }
  if (d.code) parts.push(d_.error.replace("{code}", d.code));
  if (d.durationMs !== undefined) {
    parts.push(d_.duration.replace("{time}", formatHandlingTime(d.durationMs)));
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
