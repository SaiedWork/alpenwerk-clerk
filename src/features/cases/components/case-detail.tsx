import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { ScreenshotStrip } from "@/components/shared/screenshot-strip";
import { StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { formatDateTime } from "@/lib/dates";
import { t } from "@/lib/i18n-de";
import { cn } from "@/lib/utils";
import { formatHandlingTime } from "../format";
import type { CaseView } from "../view/case-view";
import { CaseDecisionCard } from "./case-decision-card";
import { CaseEmailCard } from "./case-email-card";
import { CaseReplyCard } from "./case-reply-card";
import { CaseTimelineCard } from "./case-timeline-card";
import { ResumeButton } from "./resume-button";

const c = t.console.case;

export function CaseDetail({ view }: { view: CaseView }) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Link
          href="/faelle"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2",
          )}
        >
          <ArrowLeft data-icon="inline-start" />
          {c.back}
        </Link>
        <PageHeader
          title={view.subject}
          description={[
            c.receivedFrom.replace("{sender}", view.fromEmail),
            formatDateTime(view.receivedAt),
            `${c.handling}: ${formatHandlingTime(view.handlingMs)}`,
          ].join(" · ")}
        >
          <StatusBadge status={view.status} />
        </PageHeader>
      </div>

      {view.canResume ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-100 p-4 text-sm font-medium text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          {view.status === "FAILED" ? c.failedTitle : c.stuckTitle}
          <ResumeButton caseId={view.id} />
        </div>
      ) : null}

      {/* From xl the row is as tall as its tallest column, up to a max height that keeps the
          screenshots below in view; beyond that the card bodies scroll. The last card of
          each column grows, so all columns end at the same line. */}
      <div className="grid gap-6 xl:max-h-[clamp(22rem,calc(100svh-31rem),42rem)] xl:grid-cols-3 xl:grid-rows-[minmax(0,1fr)]">
        {/* On small screens the decision comes first; it is the answer people look for. */}
        <div className="order-first flex min-h-0 flex-col gap-4 xl:order-none">
          <CaseDecisionCard view={view} />
          <CaseReplyCard view={view} />
        </div>
        <CaseTimelineCard view={view} />
        <CaseEmailCard view={view} />
      </div>

      {view.screenshots.length > 0 ? (
        <Panel title={c.screenshotsTitle}>
          <ScreenshotStrip shots={view.screenshots} />
        </Panel>
      ) : null}

      <AutoRefresh active={view.inFlight} />
    </div>
  );
}
