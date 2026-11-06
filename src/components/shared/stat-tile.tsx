import type { ReactNode } from "react";

type StatTileProps = {
  label: string;
  /** The headline number, already formatted. */
  value: ReactNode;
  hint?: string;
};

/** One headline number with a label and a short explanation. Not a chart on purpose. */
export function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-4 text-card-foreground">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
