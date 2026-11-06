import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PanelProps = {
  title: string;
  /** Right-aligned content in the title row, e.g. a badge. */
  aside?: ReactNode;
  children: ReactNode;
  /**
   * Lets the body scroll when a parent gives the panel a fixed height. In an auto-height
   * parent nothing overflows, so the panel just grows with its content.
   */
  scrollable?: boolean;
  /** Takes the free height of its column, so the last card of each column ends at the same line. */
  grow?: boolean;
};

/** A titled card section for the detail page. */
export function Panel({
  title,
  aside,
  children,
  scrollable,
  grow,
}: PanelProps) {
  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground",
        scrollable && "min-h-36",
        grow && "grow",
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h2 className="font-medium">{title}</h2>
        {aside}
      </div>
      <div
        className={cn(
          "space-y-3",
          scrollable && "min-h-0 flex-1 overflow-y-auto",
        )}
      >
        {children}
      </div>
    </section>
  );
}
