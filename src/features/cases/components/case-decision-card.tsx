import { DecisionBadge } from "@/components/shared/decision-badge";
import { Panel } from "@/components/shared/panel";
import { ReasonCodeBadge } from "@/components/shared/reason-code-badge";
import { formatDateTime } from "@/lib/dates";
import { t } from "@/lib/i18n-de";
import type { CaseView } from "../view/case-view";

const c = t.console.case;
const RULE_TEXTS: Record<string, string> = t.rules;

export function CaseDecisionCard({ view }: { view: CaseView }) {
  const { decision, reasonCodes, review } = view;
  return (
    <Panel
      scrollable
      title={c.decisionTitle}
      aside={<DecisionBadge decision={decision} />}
    >
      {decision ? (
        <>
          <p className="text-sm">{c.decisionText[decision]}</p>
          <div className="space-y-2">
            <h3 className="text-sm font-medium">{c.whyTitle}</h3>
            {reasonCodes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{c.noReasons}</p>
            ) : (
              <ul className="space-y-2.5">
                {reasonCodes.map((code) => (
                  <li key={code} className="space-y-1 text-sm">
                    <ReasonCodeBadge code={code} />
                    <p className="text-muted-foreground">
                      {RULE_TEXTS[code] ?? code}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{c.noDecision}</p>
      )}
      {review ? (
        <p className="border-t pt-3 text-sm">
          <span className="font-medium">
            {review.decision === "approve"
              ? c.reviewApproved
              : c.reviewRejected}
          </span>{" "}
          <span className="text-muted-foreground">
            {c.reviewBy.replace("{reviewer}", review.reviewerLabel)} ·{" "}
            {formatDateTime(review.at)}
          </span>
          {review.note ? (
            <span className="mt-1 block whitespace-pre-wrap break-words">
              {review.note}
            </span>
          ) : null}
        </p>
      ) : null}
    </Panel>
  );
}
