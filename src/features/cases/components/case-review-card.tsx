"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import { Panel } from "@/components/shared/panel";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  approveCaseAction,
  rejectCaseAction,
} from "@/features/review/actions/review-actions";
import { t } from "@/lib/i18n-de";
import { useReviewAction } from "./use-review-action";

const r = t.console.case.review;
const NOTE_MAX = 500;

/** Approve or reject a case that waits at the review gate. */
export function CaseReviewCard({ caseId }: { caseId: string }) {
  const [note, setNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { pending, error, run } = useReviewAction();

  async function reject() {
    await run(() => rejectCaseAction(caseId, note));
    // On failure the message shows in the card behind the closed dialog.
    setConfirmOpen(false);
  }

  return (
    <Panel title={r.title}>
      <p className="max-w-3xl text-sm text-muted-foreground">{r.intro}</p>
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="min-w-0 flex-1 space-y-1.5">
          <label htmlFor="review-note" className="text-sm font-medium">
            {r.noteLabel}
          </label>
          <Textarea
            id="review-note"
            rows={2}
            value={note}
            maxLength={NOTE_MAX}
            disabled={pending}
            placeholder={r.notePlaceholder}
            className="min-h-14"
            onChange={(e) => setNote(e.target.value)}
          />
          <p className="text-right text-xs text-muted-foreground">
            {r.noteCount
              .replace("{count}", String(note.length))
              .replace("{max}", String(NOTE_MAX))}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 md:pt-6">
          <Button
            disabled={pending}
            onClick={() => run(() => approveCaseAction(caseId, note))}
          >
            {pending ? r.working : r.approve}
            <Check data-icon="inline-end" />
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => setConfirmOpen(true)}
          >
            {r.reject}
            <X data-icon="inline-end" />
          </Button>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{r.rejectTitle}</AlertDialogTitle>
            <AlertDialogDescription>{r.rejectText}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{r.cancel}</AlertDialogCancel>
            <Button variant="destructive" disabled={pending} onClick={reject}>
              {pending ? r.working : r.confirmReject}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  );
}
