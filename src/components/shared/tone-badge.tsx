import type { ComponentProps } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "info" | "warning" | "success" | "danger";

// Soft background with a dark text of the same hue; inverted for dark mode.
const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  info: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  warning: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  success:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  danger: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

type ToneBadgeProps = ComponentProps<typeof Badge> & { tone: Tone };

export function ToneBadge({ tone, className, ...props }: ToneBadgeProps) {
  return (
    <Badge
      variant="ghost"
      className={cn("border-current/40", TONE_CLASSES[tone], className)}
      {...props}
    />
  );
}
