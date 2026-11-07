import { StatTile } from "@/components/shared/stat-tile";
import type { EvalSummaryFile } from "@/features/kpi/schemas/eval-summary";
import { t } from "@/lib/i18n-de";

const e = t.console.kpi.eval;

const percent = new Intl.NumberFormat("de-DE", {
  style: "percent",
  maximumFractionDigits: 1,
});

/** Replay eval result from the last CI run (static JSON). Renders nothing without a summary. */
export function EvalBadge({ summary }: { summary: EvalSummaryFile | null }) {
  if (!summary) return null;
  const { metrics } = summary;
  return (
    <section className="space-y-3" aria-labelledby="eval-title">
      <div className="space-y-1">
        <h2 id="eval-title" className="text-base font-medium">
          {e.title}
        </h2>
        <p className="text-sm text-muted-foreground">
          {e.summary
            .replace("{correct}", String(summary.allCorrect))
            .replace("{cases}", String(summary.cases))}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label={e.intent} value={percent.format(metrics.intent)} />
        <StatTile label={e.fields} value={percent.format(metrics.fields)} />
        <StatTile label={e.decision} value={percent.format(metrics.decision)} />
        <StatTile
          label={e.reasonCodes}
          value={percent.format(metrics.reasonCodes)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {e.note
          .replace("{models}", summary.models.join(", "))
          .replace("{prompt}", summary.promptVersion)}
      </p>
    </section>
  );
}
