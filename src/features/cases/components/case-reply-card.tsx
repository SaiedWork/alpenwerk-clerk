import { Panel } from "@/components/shared/panel";
import { ToneBadge } from "@/components/shared/tone-badge";
import { t } from "@/lib/i18n-de";
import type { CaseView } from "../view/case-view";

const c = t.console.case;

export function CaseReplyCard({ view }: { view: CaseView }) {
  const { reply } = view;
  return (
    <Panel
      scrollable
      grow
      title={c.replyTitle}
      aside={
        reply ? (
          <span className="flex gap-1.5">
            {reply.editedByHuman ? (
              <ToneBadge tone="neutral">{c.replyEdited}</ToneBadge>
            ) : null}
            <ToneBadge
              tone={reply.status === "simulated_sent" ? "success" : "info"}
            >
              {c.replyStatus[reply.status]}
            </ToneBadge>
          </span>
        ) : null
      }
    >
      {reply ? (
        <div className="space-y-2 text-sm">
          <p className="font-medium break-words">{reply.subject}</p>
          <p className="whitespace-pre-wrap break-words text-muted-foreground">
            {reply.body}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{c.noReply}</p>
      )}
    </Panel>
  );
}
