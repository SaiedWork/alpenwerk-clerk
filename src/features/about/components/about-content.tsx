import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Panel } from "@/components/shared/panel";
import { STEP_NAMES } from "@/agent/pipeline/types";
import { t } from "@/lib/i18n-de";

const a = t.console.about;

const TRY_LINKS = [
  { href: "/posteingang", ...a.try.inbox },
  { href: "/freigaben", ...a.try.reviews },
  { href: "/audit", ...a.try.audit },
] as const;

const FLOW_TEXT: Record<string, string> = a.flow;
const STEP_LABELS: Record<string, string> = t.console.case.steps;

/** Static explainer: no data, so the page needs no database. */
export function AboutContent() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{a.principleTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {a.principle.map((p) => (
            <div
              key={p.title}
              className="space-y-1.5 rounded-xl border bg-card p-4 text-card-foreground"
            >
              <h3 className="font-medium">{p.title}</h3>
              <p className="text-sm text-muted-foreground">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <Panel title={a.flowTitle}>
        <p className="text-sm text-muted-foreground">{a.flowHint}</p>
        <ol className="space-y-3">
          {STEP_NAMES.map((step, i) => (
            <li key={step} className="flex gap-3 text-sm">
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium tabular-nums"
                aria-hidden
              >
                {i + 1}
              </span>
              <span>
                <span className="font-medium">{STEP_LABELS[step]}</span>
                <span className="block text-muted-foreground">
                  {FLOW_TEXT[step]}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title={a.safetyTitle}>
        <ul className="list-disc space-y-1.5 pl-5 text-sm">
          {a.safety.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Panel>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{a.tryTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {TRY_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group flex flex-col gap-1 rounded-xl border bg-card p-4 text-card-foreground transition-colors hover:bg-muted"
            >
              <span className="flex items-center justify-between font-medium">
                {l.title}
                <ArrowRight
                  className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
              <span className="text-sm text-muted-foreground">{l.text}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
