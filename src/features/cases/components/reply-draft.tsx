"use client";

import { Pencil, Send } from "lucide-react";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  editReplyAction,
  sendReplyAction,
} from "@/features/review/actions/review-actions";
import { t } from "@/lib/i18n-de";
import { useReviewAction } from "./use-review-action";

const r = t.console.case.review;

type Props = { caseId: string; subject: string; body: string };

/** A reply draft a human can edit and send (simulated). */
export function ReplyDraft({ caseId, subject, body }: Props) {
  const [editing, setEditing] = useState(false);
  const [subjectValue, setSubjectValue] = useState(subject);
  const [bodyValue, setBodyValue] = useState(body);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { pending, error, run, clearError } = useReviewAction();

  function startEdit() {
    setSubjectValue(subject);
    setBodyValue(body);
    clearError();
    setEditing(true);
  }

  async function save() {
    if (await run(() => editReplyAction(caseId, subjectValue, bodyValue))) {
      setEditing(false);
    }
  }

  async function send() {
    await run(() => sendReplyAction(caseId));
    setConfirmOpen(false);
  }

  return (
    <div className="space-y-3 text-sm">
      {editing ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="reply-subject" className="font-medium">
              {r.editSubject}
            </label>
            <Input
              id="reply-subject"
              value={subjectValue}
              maxLength={200}
              disabled={pending}
              onChange={(e) => setSubjectValue(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="reply-body" className="font-medium">
              {r.editBody}
            </label>
            <Textarea
              id="reply-body"
              value={bodyValue}
              maxLength={4000}
              disabled={pending}
              className="min-h-48"
              onChange={(e) => setBodyValue(e.target.value)}
            />
          </div>
          <div className="sticky bottom-0 flex flex-wrap gap-2 bg-card pt-2">
            <Button disabled={pending} onClick={save}>
              {pending ? r.working : r.save}
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setEditing(false)}
            >
              {r.discard}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-muted-foreground">{r.draftHint}</p>
          <div className="space-y-2">
            <p className="font-medium break-words">{subject}</p>
            <p className="whitespace-pre-wrap break-words text-muted-foreground">
              {body}
            </p>
          </div>
          <div className="sticky bottom-0 flex flex-wrap gap-2 bg-card pt-2">
            <Button variant="outline" onClick={startEdit} disabled={pending}>
              {r.edit}
              <Pencil data-icon="inline-end" />
            </Button>
            <Button onClick={() => setConfirmOpen(true)} disabled={pending}>
              {r.send}
              <Send data-icon="inline-end" />
            </Button>
          </div>
        </>
      )}
      {error ? (
        <p role="alert" className="text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{r.sendTitle}</AlertDialogTitle>
            <AlertDialogDescription>{r.sendText}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{r.cancel}</AlertDialogCancel>
            <Button disabled={pending} onClick={send}>
              {pending ? r.working : r.confirmSend}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
