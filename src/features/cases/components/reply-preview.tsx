import { ToneBadge } from "@/components/shared/tone-badge";
import { t } from "@/lib/i18n-de";
import type { ReplyPreview as Preview } from "../view/preview-reply";

const r = t.console.case.review;

/** Read-only preview of the reply for both review outcomes. Nothing here is stored. */
export function ReplyPreview({ preview }: { preview: Preview }) {
  const variants = [
    { label: r.previewApprove, reply: preview.approve },
    { label: r.previewReject, reply: preview.reject },
  ];
  return (
    <div className="space-y-4 text-sm">
      <p className="text-muted-foreground">{r.previewIntro}</p>
      {variants.map(({ label, reply }) => (
        <div key={label} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <span className="font-medium">{label}</span>
            <ToneBadge tone="neutral">{r.previewBadge}</ToneBadge>
          </div>
          <p className="font-medium break-words">{reply.subject}</p>
          <p className="whitespace-pre-wrap break-words text-muted-foreground">
            {reply.body}
          </p>
        </div>
      ))}
    </div>
  );
}
