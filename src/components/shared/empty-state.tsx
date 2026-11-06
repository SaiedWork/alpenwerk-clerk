import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  children?: ReactNode;
};

export function EmptyState({
  icon: Icon,
  title,
  hint,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center">
      {Icon ? (
        <Icon className="size-8 text-muted-foreground" aria-hidden />
      ) : null}
      <p className="font-medium">{title}</p>
      {hint ? (
        <p className="max-w-md text-sm text-muted-foreground">{hint}</p>
      ) : null}
      {children}
    </div>
  );
}
