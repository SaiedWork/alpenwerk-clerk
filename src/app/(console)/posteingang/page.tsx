import type { Metadata } from "next";
import { Panel } from "@/components/shared/panel";
import { PageHeader } from "@/components/shared/page-header";
import { createDbStores } from "@/agent/llm/stores";
import { getDb } from "@/db/client";
import { SimulatorForm } from "@/features/inbox/components/simulator-form";
import { berlinDayStart } from "@/lib/dates";
import { env } from "@/lib/env";
import { t } from "@/lib/i18n-de";
import { logger } from "@/lib/logger";

// The live budget changes all day, so never prerender this page.
export const metadata: Metadata = { title: t.console.nav.inbox };

export const dynamic = "force-dynamic";

// The submit action starts the pipeline in `after()`, so it needs the full function time.
export const maxDuration = 60;

async function remainingLiveBudget(): Promise<number | null> {
  try {
    const used = await createDbStores(getDb()).calls.countLiveSince(
      berlinDayStart(new Date()),
    );
    return Math.max(0, env.LLM_DAILY_CALL_CAP - used);
  } catch (error) {
    logger.warn({ err: error }, "live budget unavailable");
    return null;
  }
}

export default async function InboxPage() {
  const s = t.console.inbox;
  const liveEnabled = env.LLM_PROVIDER === "anthropic";
  const remaining = liveEnabled ? await remainingLiveBudget() : null;

  const budget = !liveEnabled
    ? s.budgetOff
    : remaining === null
      ? null
      : s.budget
          .replace("{remaining}", String(remaining))
          .replace("{cap}", String(env.LLM_DAILY_CALL_CAP));

  return (
    <div className="space-y-8">
      <PageHeader title={s.title} description={s.description} />
      <Panel title={s.formTitle}>
        <SimulatorForm liveEnabled={liveEnabled} />
      </Panel>
      <div className="space-y-1 text-sm text-muted-foreground">
        {budget ? <p>{budget}</p> : null}
        <p>
          {s.limits
            .replace("{submit}", String(env.RATE_LIMIT_SUBMIT_PER_DAY))
            .replace("{live}", String(env.RATE_LIMIT_LIVE_PER_HOUR))}
        </p>
      </div>
    </div>
  );
}
