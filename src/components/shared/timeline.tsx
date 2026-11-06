import { CircleCheck, CircleMinus, CircleX, Loader } from "lucide-react";
import type { ComponentType } from "react";
import type { EventStatus } from "@/agent/pipeline/types";
import { t } from "@/lib/i18n-de";
import { cn } from "@/lib/utils";

export type TimelineItem = {
  key: string | number;
  title: string;
  status: EventStatus;
  /** Small text next to the title, e.g. the duration. */
  meta?: string;
  description?: string | null;
  /** Monospace code under the description, e.g. an error code. */
  code?: string | null;
};

const ICONS: Record<
  EventStatus,
  { icon: ComponentType<{ className?: string }>; className: string }
> = {
  succeeded: {
    icon: CircleCheck,
    className: "text-emerald-600 dark:text-emerald-400",
  },
  failed: { icon: CircleX, className: "text-red-600 dark:text-red-400" },
  skipped: { icon: CircleMinus, className: "text-muted-foreground" },
  started: {
    icon: Loader,
    className: "animate-spin text-blue-600 dark:text-blue-400",
  },
};

/** Vertical list of steps with a status icon and a connecting line. */
export function Timeline({ items }: { items: readonly TimelineItem[] }) {
  return (
    <ol>
      {items.map((item, i) => {
        const { icon: Icon, className } = ICONS[item.status];
        const last = i === items.length - 1;
        return (
          <li key={item.key} data-testid="timeline-step" className="flex gap-3">
            <div className="flex flex-col items-center">
              <Icon className={cn("size-5 shrink-0", className)} />
              {last ? null : <div className="w-px flex-1 bg-border" />}
            </div>
            <div className={cn("min-w-0 flex-1 text-sm", !last && "pb-5")}>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">{item.title}</span>
                <span className="text-xs text-muted-foreground">
                  {t.console.case.eventStatus[item.status]}
                  {item.meta ? ` · ${item.meta}` : ""}
                </span>
              </div>
              {item.description ? (
                <p className="mt-0.5 text-muted-foreground">
                  {item.description}
                </p>
              ) : null}
              {item.code ? (
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {item.code}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
