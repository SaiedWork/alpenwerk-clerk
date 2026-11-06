import { Panel } from "@/components/shared/panel";
import { Timeline, type TimelineItem } from "@/components/shared/timeline";
import { t } from "@/lib/i18n-de";
import { formatHandlingTime } from "../format";
import type { CaseView } from "../view/case-view";

const c = t.console.case;
const STEP_LABELS: Record<string, string> = c.steps;

export function CaseTimelineCard({ view }: { view: CaseView }) {
  const items: TimelineItem[] = view.timeline.map((e) => ({
    key: e.id,
    title: STEP_LABELS[e.step] ?? e.step,
    status: e.status,
    meta: e.durationMs === null ? undefined : formatHandlingTime(e.durationMs),
    description: e.summary,
    code: e.errorCode,
  }));
  return (
    <Panel scrollable grow title={c.timelineTitle}>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{c.noEvents}</p>
      ) : (
        <Timeline items={items} />
      )}
    </Panel>
  );
}
