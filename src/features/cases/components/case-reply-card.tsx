import { Panel } from "@/components/shared/panel";
import { ToneBadge } from "@/components/shared/tone-badge";
import { t } from "@/lib/i18n-de";
import type { CaseView } from "../view/case-view";
import { ReplyDraft } from "./reply-draft";
import { ReplyPreview } from "./reply-preview";

const c = t.console.case;

export function CaseReplyCard({ view }: { view: CaseView }) {
  const { reply } = view;
  return (
    <Panel
      scrollable
      grow
      title={
        view.replyPreview ? t.console.case.review.previewTitle : c.replyTitle
      }
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
      {reply?.status === "draft" && view.status === "REPLY_READY" ? (
        <ReplyDraft
          key={`${reply.subject}\n${reply.body}`}
          caseId={view.id}
          subject={reply.subject}
          body={reply.body}
        />
      ) : reply ? (
        <div className="space-y-2 text-sm">
          <p className="font-medium break-words">{reply.subject}</p>
          <p className="whitespace-pre-wrap break-words text-muted-foreground">
            {reply.body}
          </p>
        </div>
      ) : view.replyPreview ? (
        <ReplyPreview preview={view.replyPreview} />
      ) : (
        <p className="text-sm text-muted-foreground">{c.noReply}</p>
      )}
    </Panel>
  );
}
