import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatTile } from "@/components/shared/stat-tile";
import { getDb } from "@/db/client";
import {
  BarChartCard,
  type BarDatum,
} from "@/features/kpi/components/bar-chart-card";
import { EvalBadge } from "@/features/kpi/components/eval-badge";
import { parseEvalSummary } from "@/features/kpi/server/eval-summary";
import { loadKpis } from "@/features/kpi/server/load-kpis";
import { summarizeKpis } from "@/features/kpi/view/kpi";
import { formatHandlingTime } from "@/features/cases/format";
import { env } from "@/lib/env";
import { t } from "@/lib/i18n-de";
import evalSummaryJson from "../../../../public/eval-summary.json";

const k = t.console.kpi;

const number = new Intl.NumberFormat("de-DE");
const usd = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

// Reads the database on every request; without this Next would prerender it at build time.
export const dynamic = "force-dynamic";

export default async function KpiPage() {
  const kpi = summarizeKpis(await loadKpis(getDb()));

  if (kpi.total === 0) {
    return (
      <div className="space-y-8">
        <PageHeader title={k.title} description={k.description} />
        <EmptyState icon={BarChart3} title={k.emptyTitle} hint={k.emptyHint} />
      </div>
    );
  }

  const decisionData: BarDatum[] = [
    ...(["AUTO_EXECUTE", "NEEDS_REVIEW", "REPLY_ONLY"] as const).map((d) => ({
      label: t.console.decision[d],
      value: kpi.byDecision[d],
    })),
    { label: k.charts.noDecision, value: kpi.undecided },
  ];
  const intentData: BarDatum[] = [
    ...(["address_change", "bank_change", "termination", "other"] as const).map(
      (i) => ({ label: t.console.intent[i], value: kpi.byIntent[i] }),
    ),
    { label: k.charts.noIntent, value: kpi.unrecognizedIntent },
  ];
  const statusData: BarDatum[] = Object.entries(kpi.byStatus)
    .filter(([, n]) => n > 0)
    .map(([status, n]) => ({
      label: t.console.status[status as keyof typeof t.console.status],
      value: n,
    }));

  return (
    <div className="space-y-8">
      <PageHeader title={k.title} description={k.description} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile
          label={k.tiles.total.label}
          value={number.format(kpi.total)}
          hint={k.tiles.total.hint}
        />
        <StatTile
          label={k.tiles.auto.label}
          value={kpi.autoSharePct === null ? "–" : `${kpi.autoSharePct} %`}
          hint={
            kpi.autoSharePct === null
              ? k.tiles.auto.none
              : k.tiles.auto.hint
                  .replace("{count}", String(kpi.byDecision.AUTO_EXECUTE))
                  .replace("{decided}", String(kpi.decided))
          }
        />
        <StatTile
          label={k.tiles.waiting.label}
          value={number.format(kpi.waitingForHuman)}
          hint={k.tiles.waiting.hint}
        />
        <StatTile
          label={k.tiles.handling.label}
          value={formatHandlingTime(kpi.avgHandlingMs)}
          hint={
            kpi.avgHandlingMs === null
              ? k.tiles.handling.none
              : k.tiles.handling.hint
          }
        />
        <StatTile
          label={k.tiles.live.label}
          value={number.format(kpi.liveCallsToday)}
          hint={k.tiles.live.hint.replace(
            "{cap}",
            String(env.LLM_DAILY_CALL_CAP),
          )}
        />
        <StatTile
          label={k.tiles.cost.label}
          value={usd.format(kpi.estCostUsd)}
          hint={k.tiles.cost.hint.replace(
            "{calls}",
            String(kpi.liveCallsTotal),
          )}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarChartCard title={k.charts.decision} data={decisionData} />
        <BarChartCard title={k.charts.intent} data={intentData} />
        <div className="lg:col-span-2">
          <BarChartCard title={k.charts.status} data={statusData} />
        </div>
      </div>

      <EvalBadge summary={parseEvalSummary(evalSummaryJson)} />
    </div>
  );
}
