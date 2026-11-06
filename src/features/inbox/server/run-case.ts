import { getModel } from "@/agent/llm/provider";
import { createDbStores } from "@/agent/llm/stores";
import { createDbPipelineStore } from "@/agent/pipeline/db-store";
import { runPipeline } from "@/agent/pipeline/runner";
import { getDb } from "@/db/client";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createSeedSnapshotReader } from "./seed-snapshot-reader";

/**
 * Composition root for running the pipeline on one case. The snapshot reader is a stub over
 * seed fixtures until the browser driver exists (Day 3); swapping it is a one-line change here.
 * Never throws: it runs inside `after()`, where nobody could handle an error. Step failures
 * are already stored on the case; this only guards what happens outside a step.
 */
export async function runCase(caseId: string): Promise<void> {
  try {
    const db = getDb();
    const stores = createDbStores(db);
    await runPipeline(caseId, {
      store: createDbPipelineStore(db),
      reader: createSeedSnapshotReader(),
      llm: () => ({
        ...stores,
        model: getModel({
          provider: env.LLM_PROVIDER,
          anthropicApiKey: env.ANTHROPIC_API_KEY,
          anthropicModel: env.ANTHROPIC_MODEL,
        }),
        modelName:
          env.LLM_PROVIDER === "replay" ? "replay" : env.ANTHROPIC_MODEL,
        dailyCap: env.LLM_DAILY_CALL_CAP,
      }),
    });
  } catch (error) {
    logger.error({ err: error, caseId }, "pipeline run crashed");
  }
}
