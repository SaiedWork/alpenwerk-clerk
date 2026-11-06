"use client";

import { Send } from "lucide-react";
import { useState, useTransition } from "react";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MAX_BODY_CHARS, MAX_SUBJECT_CHARS } from "@/agent/llm/limits";
import { formatDateTime } from "@/lib/dates";
import { t } from "@/lib/i18n-de";
import { normalizeText } from "@/lib/normalize";
import { SAMPLE_GROUPS, SAMPLES, type Sample } from "../samples";
import { submitEmailAction } from "../actions/submit-action";

const s = t.console.inbox;
const CUSTOM = "custom";
const FIRST = SAMPLES[0];

const sameText = (a: string, b: string) =>
  normalizeText(a) === normalizeText(b);

/** Prefilled with a recorded sample; any edit turns it into a text that needs a live call. */
export function SimulatorForm({ liveEnabled }: { liveEnabled: boolean }) {
  const [from, setFrom] = useState(FIRST.email.from);
  const [subject, setSubject] = useState(FIRST.email.subject);
  const [body, setBody] = useState(FIRST.email.body);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // The picker follows the text: once it no longer matches a sample, it is a custom email.
  const sample: Sample | undefined = SAMPLES.find(
    (x) => sameText(x.email.subject, subject) && sameText(x.email.body, body),
  );
  const recorded = sample !== undefined;
  const picked = sample?.id ?? CUSTOM;

  function pick(id: string) {
    setError(null);
    const next = SAMPLES.find((x) => x.id === id);
    setFrom(next?.email.from ?? "");
    setSubject(next?.email.subject ?? "");
    setBody(next?.email.body ?? "");
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        // On success the action redirects, so this only returns for a failure.
        const result = await submitEmailAction({ from, subject, body });
        if (result) {
          const message = s.errors[result.error];
          setError(
            result.resetAt
              ? `${message} ${s.errors.retryAfter.replace("{time}", formatDateTime(new Date(result.resetAt)))}`
              : message,
          );
        }
      } catch (e) {
        // `redirect()` surfaces as a thrown navigation signal that Next handles itself.
        if (isRedirectError(e)) throw e;
        setError(s.errors.UNKNOWN);
      }
    });
  }

  const items = [
    { value: CUSTOM, label: s.custom },
    ...SAMPLES.map((x) => ({ value: x.id, label: s.samples[x.id].title })),
  ];

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="grid max-w-xl gap-1.5 text-sm">
        <label htmlFor="sample" className="font-medium">
          {s.sampleLabel}
        </label>
        <Select
          items={items}
          value={picked}
          onValueChange={(v) => pick(String(v))}
        >
          <SelectTrigger id="sample" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            align="start"
            className="max-h-80"
          >
            <SelectItem value={CUSTOM}>{s.custom}</SelectItem>
            {SAMPLE_GROUPS.map((group) => (
              <SelectGroup key={group}>
                <SelectLabel>{s.groups[group]}</SelectLabel>
                {SAMPLES.filter((x) => x.group === group).map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {s.samples[x.id].title}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        {sample ? (
          <p className="text-muted-foreground">{s.samples[sample.id].hint}</p>
        ) : (
          <p className="text-muted-foreground">{s.customHint}</p>
        )}
      </div>

      <div className="grid gap-4">
        <div className="grid max-w-xl gap-1.5 text-sm">
          <label htmlFor="from" className="font-medium">
            {s.from}
          </label>
          <Input
            id="from"
            type="email"
            required
            maxLength={200}
            value={from}
            disabled={pending}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5 text-sm">
          <label htmlFor="subject" className="font-medium">
            {s.subject}
          </label>
          <Input
            id="subject"
            maxLength={MAX_SUBJECT_CHARS}
            value={subject}
            disabled={pending}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5 text-sm">
          <label htmlFor="body" className="font-medium">
            {s.body}
          </label>
          <Textarea
            id="body"
            required
            maxLength={MAX_BODY_CHARS}
            value={body}
            disabled={pending}
            className="min-h-48"
            onChange={(e) => setBody(e.target.value)}
          />
          <p className="text-right text-xs text-muted-foreground">
            {body.length} / {MAX_BODY_CHARS}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || body.trim() === ""}>
          {pending ? s.sending : s.send}
          <Send data-icon="inline-end" />
        </Button>
        {recorded ? (
          <ToneBadge tone="success">{s.recorded}</ToneBadge>
        ) : liveEnabled ? (
          <ToneBadge tone="info">{s.live}</ToneBadge>
        ) : (
          <ToneBadge tone="warning">{s.liveOff}</ToneBadge>
        )}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}
    </form>
  );
}

/** Next's `redirect()` throws an error whose digest starts with NEXT_REDIRECT. */
function isRedirectError(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}
