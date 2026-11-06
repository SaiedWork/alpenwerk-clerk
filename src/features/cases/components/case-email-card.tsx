import { Panel } from "@/components/shared/panel";
import { t } from "@/lib/i18n-de";
import type { CaseView } from "../view/case-view";

const c = t.console.case;

/** The original email (plain text only) and what the AI extracted from it. */
export function CaseEmailCard({ view }: { view: CaseView }) {
  return (
    <div className="flex min-h-0 flex-col gap-4">
      <Panel scrollable title={c.emailTitle}>
        <p className="whitespace-pre-wrap break-words text-sm">{view.body}</p>
      </Panel>
      <Panel
        scrollable
        grow
        title={c.extractedTitle}
        aside={
          view.confidencePct !== null ? (
            <span className="text-xs text-muted-foreground">
              {c.confidence}: {view.confidencePct} %
            </span>
          ) : null
        }
      >
        {view.fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">{c.noExtraction}</p>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            {view.fields.map((f) => (
              <div key={f.label} className="contents">
                <dt className="text-muted-foreground">{f.label}</dt>
                <dd className="min-w-0 break-words">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Panel>
    </div>
  );
}
