import { getModel } from "@/agent/llm/provider";
import { createDbStores } from "@/agent/llm/stores";
import { createDbPipelineStore } from "@/agent/pipeline/db-store";
import { runPipeline } from "@/agent/pipeline/runner";
import { getDb } from "@/db/client";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createCaseLegacyReader, type CaseLegacyReader } from "./legacy-reader";

/**
 * Composition root for running the pipeline on one case. The identify step reads the legacy
 * system through the browser driver or, with `LEGACY_READER=seed`, a stub over seed fixtures.
 * Never throws: it runs inside `after()`, where nobody could handle an error. Step failures
 * are already stored on the case; this only guards what happens outside a step.
 */
export async function runCase(caseId: string): Promise<void> {
  let legacy: CaseLegacyReader | undefined;
  try {
    const db = getDb();
    legacy = createCaseLegacyReader(db, caseId);
    const stores = createDbStores(db);
    await runPipeline(caseId, {
      store: createDbPipelineStore(db),
      reader: legacy.reader,
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
  } finally {
    await legacy?.close().catch((error: unknown) => {
      logger.error({ err: error, caseId }, "closing the browser failed");
    });
  }
}
